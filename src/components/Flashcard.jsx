// src/components/Flashcard.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "../styles";
import "../animations.css";

export default function Flashcard({
  current,
  pictureOnly,
  showAnswer,
  setShowAnswer,
  speak,
  grade,        // boolean grader (existing)
  gradeWith,    // optional: "again" | "hard" | "good" | "easy"
}) {
  const [slide, setSlide] = useState(""); // "", "slide-left", "slide-right"
  const [reverse, setReverse] = useState(() => localStorage.getItem("fc-reverse") === "1");
  const cardRef = useRef(null);
  const animTimer = useRef(null);

  // reduced motion?
  const prefersReduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    return () => {
      if (animTimer.current) {
        clearTimeout(animTimer.current);
        animTimer.current = null;
      }
    };
  }, []);

  // Persist reverse mode
  useEffect(() => {
    localStorage.setItem("fc-reverse", reverse ? "1" : "0");
  }, [reverse]);

  // Keybindings
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        setShowAnswer((s) => !s);
        return;
      }
      if (e.key.toLowerCase() === "r") {
        setReverse((r) => !r);
        return;
      }

      // 4-grade shortcuts (if available)
      if (gradeWith) {
        if (e.key === "1") return doGrade("again");
        if (e.key === "2") return doGrade("hard");
        if (e.key === "3") return doGrade("good");
        if (e.key === "4") return doGrade("easy");
      } else {
        // binary fallback
        if (e.key === "ArrowLeft") return handleBinary(false);
        if (e.key === "ArrowRight") return handleBinary(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeWith]);

  // Mobile swipe -> grade (binary; works even if gradeWith provided)
  const touch = useRef({ x0: 0, y0: 0, dx: 0, moved: false });
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x0: t.clientX, y0: t.clientY, dx: 0, moved: false };
  };
  const onTouchMove = (e) => {
    const t = e.touches[0];
    touch.current.moved = true;
    touch.current.dx = t.clientX - touch.current.x0;
  };
  const onTouchEnd = () => {
    const dx = touch.current.dx;
    if (Math.abs(dx) > 60) {
      // right swipe = correct; left = wrong
      if (gradeWith) {
        doGrade(dx > 0 ? "good" : "again");
      } else {
        handleBinary(dx > 0);
      }
    }
  };

  // Animate out, then call grader
  const animateAndGrade = (isRight, fn) => {
    if (!current) return;
    if (prefersReduce) {
      setShowAnswer(false);
      fn();
      return;
    }
    setSlide(isRight ? "slide-right" : "slide-left");

    const el = cardRef.current;
    if (!el) {
      setShowAnswer(false);
      fn();
      setSlide("");
      return;
    }

    const onEnd = () => {
      el.removeEventListener("transitionend", onEnd);
      if (animTimer.current) {
        clearTimeout(animTimer.current);
        animTimer.current = null;
      }
      setSlide("");
      setShowAnswer(false);
      fn();
    };

    el.addEventListener("transitionend", onEnd, { once: true });

    animTimer.current = setTimeout(() => {
      el.removeEventListener("transitionend", onEnd);
      setSlide("");
      setShowAnswer(false);
      fn();
      animTimer.current = null;
    }, 600);
  };

  // Binary handler (existing)
  const handleBinary = (isCorrect) => {
    animateAndGrade(isCorrect, () => grade?.(isCorrect));
  };

  // 4-grade handler → maps to animation direction (right for positive)
  const doGrade = (g) => {
    const positive = g === "good" || g === "easy";
    animateAndGrade(positive, () => gradeWith?.(g));
  };

  if (!current) {
    return (
      <section style={styles.card}>
        <div style={styles.h2}>Flashcards</div>
        <div style={{ color: "#64748b" }}>🎉 No cards due with current filters.</div>
      </section>
    );
    }

  const frontMain = reverse ? (current.translation || "—") : current.word;
  const backMain  = reverse ? current.word : (current.translation || "—");
console.log('Flashcard build v2.1 (reverse mode enabled)');
  return (

    <section style={styles.card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={styles.h2}>Flashcards</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#475569" }}>
            Mode: <strong>{reverse ? "Translation → English" : "English → Translation"}</strong>
          </span>
          <button
            type="button"
            onClick={() => setReverse((r) => !r)}
            title="Toggle direction (R)"
            style={{ ...styles.ghost, padding: "6px 10px", lineHeight: 1, whiteSpace: "nowrap" }}
          >
            {reverse ? "EN ← TR" : "EN → TR"}
          </button>
        </div>
      </div>

      {/* Slide wrapper */}
      <div
        ref={cardRef}
        className={`card-anim ${slide}`}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Flip scene */}
        <div
          className="flip-scene"
          style={{
            marginTop: 8,
            perspective: "1200px",
            perspectiveOrigin: "50% 50%",
            width: "100%",
            position: "relative",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className={`flip-card ${showAnswer ? "is-flipped" : ""}`}
            style={{
              position: "relative",
              display: "block",
              transformStyle: "preserve-3d",
              transition: "transform 420ms cubic-bezier(.2,.7,.2,1)",
              minHeight: 220,
              willChange: "transform",
            }}
          >
            {/* FRONT */}
            <div
              className="flip-face front"
              style={{
                position: "relative",
                zIndex: 2,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {frontMain}{" "}
                {!reverse && current.ipa && (
                  <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                {current.category} • {current.difficulty}
              </div>

              {pictureOnly && current.imageUrl ? (
                <div
                  style={{
                    position: "relative",
                    borderRadius: 12,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  <img
                    alt={current.word}
                    src={current.imageUrl}
                    style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover" }}
                  />
                  {!showAnswer && (
                    <button
                      type="button"
                      onClick={() => setShowAnswer(true)}
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(0,0,0,.35)",
                        color: "#fff",
                        fontWeight: 700,
                        border: 0,
                        cursor: "pointer",
                      }}
                    >
                      Tap to reveal
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {current.imageUrl && (
                    <img
                      alt={current.word}
                      src={current.imageUrl}
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: 160,
                        objectFit: "cover",
                        borderRadius: 12,
                        marginTop: 8,
                      }}
                    />
                  )}
                  {current.mnemonic && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#334155" }}>
                      🧠 {current.mnemonic}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {!reverse && (
                      <button type="button" style={styles.ghost} onClick={() => speak(current.word)}>
                        🔊 Speak
                      </button>
                    )}
                    {!showAnswer && (
                      <button
                        type="button"
                        style={styles.primary}
                        onClick={() => setShowAnswer(true)}
                        title="Space"
                      >
                        Show answer
                      </button>
                    )}
                  </div>
                </>
              )}

              <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                Interval: {current.interval} day(s)
              </div>
            </div>

            {/* BACK */}
            <div
              className="flip-face back"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg) translateZ(0)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {backMain}
              </div>

              {reverse && (
                <>
                  {current.ipa && (
                    <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                      ({current.ipa})
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <button type="button" style={styles.ghost} onClick={() => speak(current.word)}>
                      🔊 Speak
                    </button>
                  </div>
                </>
              )}

              {current.example && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
                  Example: {current.example}
                </div>
              )}

              {/* Grading row */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {gradeWith ? (
                  <>
                    <button type="button" style={styles.ghost}  onClick={() => doGrade("again")} title="1">↺ Again</button>
                    <button type="button" style={styles.ghost}  onClick={() => doGrade("hard")}  title="2">😬 Hard</button>
                    <button type="button" style={styles.primary} onClick={() => doGrade("good")}  title="3">✅ Good</button>
                    <button type="button" style={styles.ghost}  onClick={() => doGrade("easy")}  title="4">✨ Easy</button>
                  </>
                ) : (
                  <>
                    <button type="button" style={styles.primary} onClick={() => handleBinary(true)}>
                      ✅ I was right
                    </button>
                    <button type="button" style={styles.ghost} onClick={() => handleBinary(false)}>
                      ❌ I was wrong
                    </button>
                  </>
                )}
                <button type="button" style={styles.ghost} onClick={() => setShowAnswer(false)}>
                  ⟲ Flip back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}