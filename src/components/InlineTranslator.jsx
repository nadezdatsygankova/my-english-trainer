import React, { useEffect, useRef, useState } from "react";
import { autoTranslate } from "../utils/translator";

// Simple utility to strip punctuation around a token
const cleanToken = (t) => t.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();

export default function InlineTranslator({
  token,
  targetLang = "ru",
  onAdd,          // (entry) => void
  onClose,        // () => void
  anchorRect,     // DOMRect from the clicked word (for positioning)
}) {
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState("");
  const [trans, setTrans] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const baseWord = cleanToken(token);
    setBase(baseWord);
    let alive = true;
    (async () => {
      try {
        const t = await autoTranslate(baseWord, { from: "en", to: targetLang });
        if (alive) { setTrans(t); setLoading(false); }
      } catch {
        if (alive) { setTrans(""); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token, targetLang]);

  // Close when clicking outside
  useEffect(() => {
    const clickAway = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", clickAway, true);
    return () => document.removeEventListener("mousedown", clickAway, true);
  }, [onClose]);

  // Position near the clicked word
  const style = anchorRect
    ? {
        position: "fixed",
        top: Math.min(window.innerHeight - 160, anchorRect.bottom + 8),
        left: Math.min(window.innerWidth - 260, anchorRect.left),
        zIndex: 1000,
        width: 250,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        boxShadow: "0 14px 40px rgba(2,6,23,.18)",
        padding: 12,
      }
    : { display: "none" };

  return (
    <div ref={ref} style={style}>
      <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{base || token}</div>
      <div style={{ fontSize: 14, color: "#334155", minHeight: 20, marginBottom: 10 }}>
        {loading ? "Translating…" : (trans || "—")}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #cbd5e1",
            padding: "8px 10px",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={() => onAdd?.({
            word: base || token,
            translation: trans,
            category: "noun",
            difficulty: "medium",
            modes: { flashcard: true, spelling: true },
          })}
          disabled={loading || !base}
          style={{
            background: "#6366f1",
            color: "#fff",
            border: 0,
            padding: "8px 12px",
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Add to My Words
        </button>
      </div>
    </div>
  );
}