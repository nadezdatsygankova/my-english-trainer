import React from "react";
import styles from "../styles";

export default function WordPopover({
  anchorRect, word, ipa, translation, status,
  onSetStatus, onAddToDeck, onClose, speak,
}) {
  if (!anchorRect) return null;

  const cardStyle = {
    position: "absolute",
    top: anchorRect.bottom + 6 + window.scrollY,
    left: Math.max(8, Math.min(anchorRect.left + window.scrollX, window.innerWidth - 260)),
    width: 260,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 16px 40px rgba(2,6,23,.15)",
    padding: 12,
    zIndex: 1000,
  };

  return (
    <div style={cardStyle} className="scale-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{word}</div>
          {ipa && <div style={{ fontSize: 12, color: "#64748b" }}>{ipa}</div>}
          {translation && <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>{translation}</div>}
        </div>
        <button style={styles.ghost} onClick={onClose}>✕</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button style={styles.ghost} onClick={() => speak(word)}>🔊 Speak</button>
        <button
          style={styles.primary}
          onClick={() => onAddToDeck(word)}
          title="Add to flashcards"
        >
          ＋ Add card
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>Status</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
        {["unknown","learning","known","ignored"].map(s => (
          <button
            key={s}
            onClick={() => onSetStatus(s)}
            style={{
              padding: "8px 6px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: status === s ? "#eef2ff" : "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}