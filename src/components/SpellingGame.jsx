import React from "react";
import styles from "../styles";
import { safeLower, levenshtein, shuffle } from "../utils";

/**
 * SpellingGame — independent pool (not SRS), now with Hints:
 * - Masked word with progressive letter reveal
 * - Shuffle letters (anagram) helper
 * - Keeps per-letter diff hints
 */
export default function SpellingGame({
  words,                // pre-filtered list with modes.spelling === true
  onCorrect, onIncorrect,
}) {
  const [idx, setIdx] = React.useState(0);
  const [spellInput, setSpellInput] = React.useState("");
  const [spellMsg, setSpellMsg] = React.useState(null);
  const [hintTokens, setHintTokens] = React.useState([]);
  const timeoutRef = React.useRef(null);

  // NEW hint state
  const [revealCount, setRevealCount] = React.useState(0); // how many leading letters revealed
  const [shuffled, setShuffled] = React.useState("");       // anagram helper (shuffled letters)
  const [showAnagram, setShowAnagram] = React.useState(false);

  // shuffle per mount for variety
  const session = React.useMemo(() => shuffle(words), [words]);
  const current = session[idx] ?? null;

  React.useEffect(() => {
    // reset hint state when card changes
    setRevealCount(0);
    setShuffled("");
    setShowAnagram(false);
    setSpellInput("");
    setSpellMsg(null);
    setHintTokens([]);
  }, [idx]);

  React.useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!current) {
    return (
      <section style={styles.card}>
        <div style={styles.h2}>Spelling (independent)</div>
        <div style={{ color: "#64748b" }}>Add some words (marked for Spelling) to practice.</div>
      </section>
    );
  }

  const targetRaw = (current.word || "").toString();
  const target = safeLower(targetRaw).trim();

  // --- HINT BUILDERS ---
  const buildMasked = () => {
    // reveal first N letters (letters only), keep spaces/hyphens as-is, mask others as _
    // also show correctly positioned letters from the current guess
    const guess = spellInput;
    const tChars = targetRaw.split("");
    let revealed = 0;
    return tChars
      .map((ch, i) => {
        if (!/[A-Za-z]/.test(ch)) return ch; // keep punctuation/space
        const mustReveal = revealed < revealCount;
        const fromGuess =
          guess && guess[i] && safeLower(guess[i]) === safeLower(ch) ? ch : null;
        if (mustReveal) {
          revealed += 1;
          return ch; // reveal this letter
        }
        return fromGuess ? ch : "·"; // mid-dot to keep spacing neat
      })
      .join("");
  };

  const hintMasked = buildMasked();
  const canRevealMore = revealCount < target.replace(/[^A-Za-z]/g, "").length;

  const makeAnagram = () => {
    const letters = target.replace(/[^A-Za-z]/g, "").split("");
    const mixed = shuffle(letters).join("");
    setShuffled(mixed);
    setShowAnagram(true);
  };

  // --- CHECK ---
  const checkSpelling = () => {
    const guess = safeLower(spellInput).trim();
    if (!guess) {
      setSpellMsg({ type: "bad", text: "Type your answer above." });
      setHintTokens([]);
      return;
    }
    const { distance, tokens } = levenshtein(guess, target);
    setHintTokens(tokens);
    if (distance === 0) {
      setSpellMsg({ type: "good", text: "Perfect!" });
      onCorrect?.(current);
      next(220);
    } else if (distance <= 2) {
      setSpellMsg({ type: "close", text: `Almost! (${distance} letter off)` });
      onIncorrect?.(current, { close: true });
    } else {
      setSpellMsg({ type: "bad", text: "Not quite. Check highlighted letters." });
      onIncorrect?.(current);
    }
  };

  const next = (delay = 0) => {
    timeoutRef.current = setTimeout(() => {
      setSpellInput("");
      setSpellMsg(null);
      setHintTokens([]);
      setRevealCount(0);
      setShuffled("");
      setShowAnagram(false);
      setIdx((i) => (i + 1 < session.length ? i + 1 : 0));
    }, delay);
  };

  // pulse class for feedback
  const pulseClass =
    spellMsg?.type === "good" ? "pulse-good"
    : spellMsg?.type === "close" ? "pulse-close"
    : spellMsg?.type === "bad" ? "pulse-bad"
    : "";

  return (
    <section style={styles.card}>
      <div style={styles.h2}>Spelling (independent)</div>

      <div className={`fade-in-up ${pulseClass}`}>
        {/* Prompt */}
        <div style={{ color: "#475569", marginBottom: 8 }}>Type the English word for:</div>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
          {current.translation || "—"}
        </div>

        {/* Hints row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
          marginBottom: 10
        }}>
          <div style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: "#334155" }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Hint: <strong>{targetRaw.length}</strong> chars (including spaces/punctuation)
            </div>
            <div style={{
              border: "1px dashed #cbd5e1",
              borderRadius: 8,
              padding: "8px 10px",
              letterSpacing: "1px",
              background: "#f8fafc"
            }}>
              {hintMasked}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={styles.ghost}
              onClick={() => canRevealMore && setRevealCount((n) => n + 1)}
              disabled={!canRevealMore}
              title="Reveal next letter"
            >
              🔎 Reveal letter {canRevealMore ? `(${revealCount + 1})` : "(max)"}
            </button>

            <button
              style={styles.ghost}
              onClick={makeAnagram}
              title="Shuffle letters (letters only, no spaces/punct.)"
            >
              🔀 Shuffle letters
            </button>

            {showAnagram && (
              <span style={{
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "4px 10px",
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                background: "#fff"
              }}>
                {shuffled || "—"}
              </span>
            )}
          </div>
        </div>

        {/* Input */}
        <input
          style={styles.input}
          placeholder="Type the English spelling"
          value={spellInput}
          onChange={(e) => setSpellInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') checkSpelling(); }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button style={styles.primary} onClick={checkSpelling}>Check</button>
          <button
            style={styles.ghost}
            onClick={() => { setSpellInput(""); setSpellMsg(null); setHintTokens([]); }}
          >
            Clear
          </button>
          <button style={styles.ghost} onClick={() => next()}>Skip</button>
        </div>

        {/* Result badges */}
        {spellMsg && (
          <div style={{ marginTop: 10 }}>
            {spellMsg.type === "good" && <span style={styles.badgeGood}>{spellMsg.text}</span>}
            {spellMsg.type === "close" && <span style={styles.badgeClose}>{spellMsg.text}</span>}
            {spellMsg.type === "bad" && <span style={styles.badgeBad}>{spellMsg.text}</span>}
          </div>
        )}

        {/* Per-letter guidance */}
        {hintTokens.length > 0 && (
          <div>
            <div style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>
              Hint (your input vs target):
            </div>
            <div style={styles.hintWrap}>
              {hintTokens.map((t, i) => {
                const base =
                  t.type === 'eq' ? styles.hintEq :
                  t.type === 'sub' ? styles.hintSub :
                  t.type === 'del' ? styles.hintDel : styles.hintIns;
                const text = t.type === 'ins' ? t.b : t.a || t.b;
                return <span key={i} style={base}>{text || '•'}</span>;
              })}
            </div>
            <div style={styles.hintLegend}>
              <span><span style={styles.hintEq}>a</span> correct</span>
              <span><span style={styles.hintSub}>a→b</span> wrong letter</span>
              <span><span style={styles.hintDel}>a</span> extra in your input</span>
              <span><span style={styles.hintIns}>b</span> missing letter</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}