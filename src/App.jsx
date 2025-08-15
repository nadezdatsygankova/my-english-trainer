import React, { useEffect, useMemo, useRef, useState } from "react";

/** App.jsx — Centered English Learning App (React, no external libs)
 * - Centered card layout (grid, 100dvh)
 * - Flashcards with spaced repetition (interval doubling)
 * - Quick quiz
 * - Spelling Trainer with fuzzy match
 * - NEW: Per-letter hints with diff highlighting
 * - Modal Add/Manage words
 * - Import/Export JSON
 * - Custom dropdowns for Category/Difficulty (good contrast)
 */

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().split("T")[0];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// Levenshtein distance + backtrace for per-letter hints
function levenshtein(a = "", b = "") {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const bt = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  for (let i = 0; i <= m; i++) { dp[i][0] = i; bt[i][0] = "del"; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; bt[0][j] = "ins"; }
  bt[0][0] = null;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const sub = dp[i - 1][j - 1] + cost;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const best = Math.min(sub, del, ins);
      dp[i][j] = best;
      bt[i][j] = best === sub ? (cost === 0 ? "eq" : "sub") : best === del ? "del" : "ins";
    }
  }
  // backtrace to build tokens
  let i = m, j = n;
  const tokens = [];
  while (i > 0 || j > 0) {
    const step = bt[i][j];
    if (step === "eq" || step === "sub") {
      tokens.push({ type: step === "eq" ? "eq" : "sub", a: a[i - 1], b: b[j - 1] });
      i--; j--;
    } else if (step === "del") {
      tokens.push({ type: "del", a: a[i - 1], b: "" });
      i--;
    } else if (step === "ins") {
      tokens.push({ type: "ins", a: "", b: b[j - 1] });
      j--;
    } else {
      break;
    }
  }
  tokens.reverse();
  return { distance: dp[m][n], tokens };
}

// ---------- styles ----------
const styles = {
  viewport: {
    minHeight: "100dvh",
    width: "100%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#eef2ff,#ffffff)",
    padding: 24,
  },
  centerWrap: { width: "min(100%, 980px)" },
  appCard: {
    width: "100%",
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 18px 60px rgba(2,6,23,.12)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 20,
    borderBottom: "1px solid #e2e8f0",
  },
  title: { fontSize: 24, fontWeight: 800, color: "#0f172a" },
  body: { padding: 20 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" },
  card: {
    flex: "1 1 320px",
    background: "#fff",
    border: "1px solid #eef2f7",
    borderRadius: 16,
    boxShadow: "0 6px 24px rgba(15, 23, 42, .06)",
    padding: 20,
  },
  progressShell: { width: "100%", height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" },
  progressFill: (pct) => ({ height: "100%", width: pct + "%", background: "#6366f1", transition: "width .3s" }),
  h2: { fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 10, color: "#0f172a" },
  primary: { background: "#6366f1", color: "#fff", border: 0, padding: "10px 14px", borderRadius: 10, cursor: "pointer" },
  ghost: { background: "transparent", color: "#0f172a", border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 10, cursor: "pointer" },
  danger: { background: "#ef4444", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 8, cursor: "pointer" },
  input: { width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 10, outline: "none", background: "#fff", color: "#111827" },
  selectBtn: { width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", background: "#f9fafb", textAlign: "left", cursor: "pointer", color: "#111827" },
  listItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px dashed #e2e8f0" },
  // modal
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 },
  modal: { position: "relative", width: "min(720px, 100%)", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(2,6,23,.35)", padding: 20, zIndex: 60 },
  dropdown: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 10px 30px rgba(2,6,23,.15)", zIndex: 80, maxHeight: 220, overflowY: "auto" },
  dropdownItem: { padding: "10px 12px", cursor: "pointer", color: "#111827", background: "#fff" },
  dropdownItemActive: { padding: "10px 12px", cursor: "pointer", color: "#111827", background: "#eef2ff" },
  // badges
  badgeGood: { color: "#065f46", background: "#d1fae5", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  badgeClose: { color: "#92400e", background: "#fef3c7", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  badgeBad: { color: "#991b1b", background: "#fee2e2", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  // per-letter hints
  hintWrap: { marginTop: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", display: "flex", flexWrap: "wrap", gap: 4 },
  hintEq: { background: "#dcfce7", color: "#14532d", padding: "2px 4px", borderRadius: 4 },
  hintSub: { background: "#fee2e2", color: "#7f1d1d", padding: "2px 4px", borderRadius: 4 },
  hintDel: { background: "#e0e7ff", color: "#3730a3", padding: "2px 4px", borderRadius: 4 },
  hintIns: { background: "#fde68a", color: "#7c2d12", padding: "2px 4px", borderRadius: 4 },
  hintLegend: { display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12, color: "#475569" },
};

// ---------- Custom Select (works inside modal, high-contrast text) ----------
function Select({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      {label && <label style={{ display: "block", marginBottom: 6, color: "#111827" }}>{label}</label>}
      <button type="button" style={styles.selectBtn} onClick={() => setOpen((o) => !o)}>{value}</button>
      {open && (
        <div style={styles.dropdown} role="listbox">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <div
                key={opt}
                role="option"
                aria-selected={active}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={active ? styles.dropdownItemActive : styles.dropdownItem}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // ---------- state ----------
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem("progress");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [words, setWords] = useState(() => {
    const saved = localStorage.getItem("words-v1");
    if (saved) return JSON.parse(saved);
    return [
      { id: uid(), word: "cold", translation: "холодный", category: "adjective", difficulty: "easy", interval: 1, nextReview: todayISO(), createdAt: todayISO() },
      { id: uid(), word: "liberty", translation: "свобода", category: "noun", difficulty: "medium", interval: 1, nextReview: todayISO(), createdAt: todayISO() },
    ];
  });
  const [showManager, setShowManager] = useState(false);
  const [form, setForm] = useState({ word: "", translation: "", category: "noun", difficulty: "easy" });
  const [showAnswer, setShowAnswer] = useState(false);
  const [idx, setIdx] = useState(0);
  const [filterCat, setFilterCat] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [spellInput, setSpellInput] = useState("");
  const [spellMsg, setSpellMsg] = useState(null); // {type:"good"|"close"|"bad", text}
  const [hintTokens, setHintTokens] = useState([]); // per-letter tokens from diff

  const categories = ["noun", "verb", "adjective", "expression"];
  const difficulties = ["easy", "medium", "hard"];

  // ---------- derived ----------
  const dueList = useMemo(() => words.filter((w) => !w.nextReview || w.nextReview <= todayISO()), [words]);
  const filteredDue = useMemo(() => dueList.filter((w) => (filterCat === "all" || w.category === filterCat) && (filterDiff === "all" || w.difficulty === filterDiff)), [dueList, filterCat, filterDiff]);
  const current = filteredDue[idx] ?? null;

  // ---------- effects ----------
  useEffect(() => localStorage.setItem("words-v1", JSON.stringify(words)), [words]);
  useEffect(() => localStorage.setItem("progress", String(progress)), [progress]);
  useEffect(() => setIdx(0), [filterCat, filterDiff]);

  // ---------- actions ----------
  const addWord = () => {
    if (!form.word.trim() || !form.translation.trim()) return;
    const entry = { id: uid(), word: form.word.trim(), translation: form.translation.trim(), category: form.category, difficulty: form.difficulty, interval: 1, nextReview: todayISO(), createdAt: todayISO() };
    setWords((w) => [entry, ...w]);
    setForm({ word: "", translation: "", category: "noun", difficulty: "easy" });
  };
  const delWord = (id) => { setWords((w) => w.filter((x) => x.id !== id)); setIdx(0); };
  const speak = (text) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } catch {} };
  const grade = (correct) => {
    if (!current) return;
    setWords((prev) => prev.map((w) => {
      if (w.id !== current.id) return w;
      const nextInterval = correct ? clamp(w.interval * 2, 1, 30) : 1;
      const d = new Date(); d.setDate(d.getDate() + nextInterval);
      return { ...w, interval: nextInterval, nextReview: d.toISOString().split("T")[0] };
    }));
    if (correct) setProgress((p) => clamp(p + 5, 0, 100));
    setShowAnswer(false);
    setSpellInput("");
    setSpellMsg(null);
    setHintTokens([]);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));
  };
  const exportJSON = () => { const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "words.json"; a.click(); URL.revokeObjectURL(url); };
  const onImportFile = async (e) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); try { const data = JSON.parse(text); if (!Array.isArray(data)) throw new Error("Not an array"); const normalized = data.map((item) => typeof item === "string" ? { id: uid(), word: item, translation: "", category: "noun", difficulty: "easy", interval: 1, nextReview: todayISO(), createdAt: todayISO() } : { id: uid(), interval: 1, nextReview: todayISO(), createdAt: todayISO(), category: "noun", difficulty: "easy", translation: "", ...item }); setWords((w) => [...normalized, ...w]); e.target.value = ""; } catch { alert("Invalid JSON. Expect an array of words or objects."); } };

  // ---------- spelling check w/ per-letter hints ----------
  const checkSpelling = () => {
    if (!current) return;
    const target = (current.word || "").trim().toLowerCase();
    const guess = spellInput.trim().toLowerCase();
    if (!guess) { setSpellMsg({ type: "bad", text: "Type your answer above." }); setHintTokens([]); return; }
    const { distance, tokens } = levenshtein(guess, target);
    setHintTokens(tokens);
    if (distance === 0) {
      setSpellMsg({ type: "good", text: "Perfect!" });
      grade(true);
    } else if (distance <= 2) {
      setSpellMsg({ type: "close", text: `Almost! (${distance} letter off)` });
    } else {
      setSpellMsg({ type: "bad", text: "Not quite. Check highlighted letters." });
    }
  };

  // ---------- quiz ----------
  const quiz = useMemo(() => {
    if (!current) return null;
    const correct = `${current.word} = ${current.translation || "—"}`;
    const other = words.find((w) => w.id !== current.id)?.translation || "example";
    return { question: `Pick the correct translation for \"${current.word}\"`, options: shuffle([correct, `${current.word} = ${other}`]), answer: correct };
  }, [current, words]);

  // ---------- render ----------
  return (
    <div style={styles.viewport}>
      <div style={styles.centerWrap}>
        <div style={styles.appCard}>
          <header style={styles.header}>
            <div style={styles.title}>📘 Learn English — Daily Trainer</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.ghost} onClick={exportJSON}>Export JSON</button>
              <label style={styles.primary}>
                Import JSON
                <input onChange={onImportFile} type="file" accept="application/json" style={{ display: "none" }} />
              </label>
              <button style={styles.primary} onClick={() => setShowManager(true)}>＋ Add words</button>
            </div>
          </header>

          <main style={styles.body}>
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.h2}>Progress</div>
              <div style={styles.progressShell}><div style={styles.progressFill(progress)} /></div>
              <div style={{ fontSize: 12, color: "#475569" }}>{progress}% complete • {filteredDue.length} due (filtered) / {words.length} total</div>
            </div>

            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.h2}>Filters</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select label="Category" value={filterCat === "all" ? "All" : filterCat.charAt(0).toUpperCase() + filterCat.slice(1)} options={["All","Noun","Verb","Adjective","Expression"]} onChange={(val) => setFilterCat(val.toLowerCase())} />
                <Select label="Difficulty" value={filterDiff === "all" ? "All" : filterDiff.charAt(0).toUpperCase() + filterDiff.slice(1)} options={["All","Easy","Medium","Hard"]} onChange={(val) => setFilterDiff(val.toLowerCase())} />
              </div>
            </div>

            <div style={styles.row}>
              {/* Flashcards */}
              <section style={styles.card}>
                <div style={styles.h2}>Flashcards</div>
                {!current ? (
                  <div style={{ color: "#64748b" }}>🎉 No cards due with current filters.</div>
                ) : (
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{current.word}</div>
                    <div style={{ fontSize: 13, color: "#475569" }}>{current.category} • {current.difficulty}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button style={styles.ghost} onClick={() => speak(current.word)}>🔊 Speak</button>
                      {!showAnswer && <button style={styles.primary} onClick={() => setShowAnswer(true)}>Show answer</button>}
                    </div>
                    {showAnswer && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 18, color: "#059669", fontWeight: 700 }}>{current.translation || "—"}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button style={styles.primary} onClick={() => grade(true)}>✅ I was right</button>
                          <button style={styles.ghost} onClick={() => grade(false)}>❌ I was wrong</button>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>Interval: {current.interval} day(s)</div>
                  </div>
                )}
              </section>

              {/* Spelling Trainer */}
              <section style={styles.card}>
                <div style={styles.h2}>Spelling Trainer</div>
                {!current ? (
                  <div style={{ color: "#64748b" }}>Add some words to practice spelling.</div>
                ) : (
                  <div>
                    <div style={{ color: "#475569", marginBottom: 8 }}>Type the English word for:</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{current.translation || "—"}</div>
                    <input
                      style={styles.input}
                      placeholder="Type the English spelling"
                      value={spellInput}
                      onChange={(e) => setSpellInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') checkSpelling(); }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={styles.primary} onClick={checkSpelling}>Check</button>
                      <button style={styles.ghost} onClick={() => { setSpellInput(""); setSpellMsg(null); setHintTokens([]); }}>Clear</button>
                    </div>
                    {spellMsg && (
                      <div style={{ marginTop: 10 }}>
                        {spellMsg.type === "good" && <span style={styles.badgeGood}>{spellMsg.text}</span>}
                        {spellMsg.type === "close" && <span style={styles.badgeClose}>{spellMsg.text}</span>}
                        {spellMsg.type === "bad" && <span style={styles.badgeBad}>{spellMsg.text}</span>}
                      </div>
                    )}
                    {hintTokens.length > 0 && (
                      <div>
                        <div style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>Hint (your input vs target):</div>
                        <div style={styles.hintWrap}>
                          {hintTokens.map((t, i) => {
                            const label = t.type === 'eq' ? '✓' : t.type === 'sub' ? '×' : t.type === 'del' ? '-' : '+';
                            const base = t.type === 'eq' ? styles.hintEq : t.type === 'sub' ? styles.hintSub : t.type === 'del' ? styles.hintDel : styles.hintIns;
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
                )}
              </section>

              {/* Quick Quiz */}
              <section style={styles.card}>
                <div style={styles.h2}>Quick Quiz</div>
                {!quiz ? (
                  <div style={{ color: "#64748b" }}>Add at least 2 words to generate quiz options.</div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{quiz.question}</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {quiz.options.map((o) => (
                        <button key={o} style={styles.ghost} onClick={() => alert(o === quiz.answer ? "✅ Correct" : "❌ Try again")}>{o}</button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Add/Manage Words Modal */}
      {showManager && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal} role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...styles.h2, margin: 0 }}>Add / Manage Words</div>
              <button style={styles.ghost} onClick={() => setShowManager(false)}>✕ Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ color: "#111827" }}>Word</label>
                <input style={styles.input} value={form.word} onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#111827" }}>Translation</label>
                <input style={styles.input} value={form.translation} onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))} />
              </div>
              <div>
                <Select label="Category" value={form.category.charAt(0).toUpperCase() + form.category.slice(1)} options={["Noun","Verb","Adjective","Expression"]} onChange={(val) => setForm((f) => ({ ...f, category: val.toLowerCase() }))} />
              </div>
              <div>
                <Select label="Difficulty" value={form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)} options={["Easy","Medium","Hard"]} onChange={(val) => setForm((f) => ({ ...f, difficulty: val.toLowerCase() }))} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.primary} onClick={addWord}>＋ Add word</button>
              <button style={styles.ghost} onClick={() => setForm({ word: "", translation: "", category: "noun", difficulty: "easy" })}>Reset</button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>My Words</div>
              <div>
                {words.length === 0 && <div style={{ color: "#64748b" }}>No words yet.</div>}
                {words.map((w) => (
                  <div key={w.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{w.word}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{w.translation || "—"} • {w.category} • {w.difficulty}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={styles.ghost} onClick={() => speak(w.word)}>🔊</button>
                      <button style={styles.danger} onClick={() => delWord(w.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
