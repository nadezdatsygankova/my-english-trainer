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
  grade,
}) {
  // exit animation state
  const [slide, setSlide] = useState(""); // "", "slide-left", "slide-right"
  const [reverse, setReverse] = useState(false); // NEW: reverse direction
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

  // keyboard helpers (Space = flip, R = reverse)
  useEffect(() => {
    const onKey = (e) => {
      // avoid typing in inputs
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        setShowAnswer((s) => !s);
      } else if (e.key.toLowerCase() === "r") {
        setReverse((r) => !r);
      } else if (e.key === "ArrowLeft") {
        handleGrade(false);
      } else if (e.key === "ArrowRight") {
        handleGrade(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setShowAnswer]); // grade is stable via closure below

  // mobile swipe -> grade
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
    if (Math.abs(dx) > 60) handleGrade(dx > 0);
  };

  const handleGrade = (isCorrect) => {
    if (!current) return;
    if (prefersReduce) {
      setShowAnswer(false);
      grade(isCorrect);
      return;
    }
    setSlide(isCorrect ? "slide-right" : "slide-left");

    const el = cardRef.current;
    if (!el) {
      setShowAnswer(false);
      grade(isCorrect);
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
      grade(isCorrect);
    };

    el.addEventListener("transitionend", onEnd, { once: true });

    // fail-safe if transitionend is missed
    animTimer.current = setTimeout(() => {
      el.removeEventListener("transitionend", onEnd);
      setSlide("");
      setShowAnswer(false);
      grade(isCorrect);
      animTimer.current = null;
    }, 600); // > CSS transition (320–420ms)
  };

  if (!current) {
    return (
      <section style={styles.card}>
        <div style={styles.h2}>Flashcards</div>
        <div style={{ color: "#64748b" }}>🎉 No cards due with current filters.</div>
      </section>
    );
  }

  // Direction-aware fields
  const frontMain = reverse ? (current.translation || "—") : current.word;
  const backMain = reverse ? current.word : (current.translation || "—");

  return (
    <section style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={styles.h2}>Flashcards</div>

        {/* Reverse toggle */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#475569" }}>
            Mode: <strong>{reverse ? "Translation → English" : "English → Translation"}</strong>
          </span>
          <button
            type="button"
            onClick={() => setReverse((r) => !r)}
            title="Toggle direction (R)"
            style={{
              ...styles.ghost,
              padding: "6px 10px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
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
              {/* Header row: word + meta (only show IPA for English-on-front) */}
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {frontMain}{" "}
                {!reverse && current.ipa && (
                  <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                {current.category} • {current.difficulty}
              </div>

              {/* Media / mnemonic (still useful in both modes) */}
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
                    {/* Only speak English side */}
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
              {/* Back shows the opposite side */}
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {backMain}
              </div>

              {/* If we’re revealing English on the back in reverse mode, show IPA & Speak */}
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

              {/* Example sentence always helpful when revealed */}
              {current.example && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
                  Example: {current.example}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" style={styles.primary} onClick={() => handleGrade(true)}>
                  ✅ I was right
                </button>
                <button type="button" style={styles.ghost} onClick={() => handleGrade(false)}>
                  ❌ I was wrong
                </button>
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