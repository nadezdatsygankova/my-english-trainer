import React from "react";
import styles from "../styles";

export default function SpeakPractice({ current, enableSR, speak, startSR, grade }) {
  return (
    <section style={styles.card}>
      <div style={styles.h2}>Speak Practice</div>
      {!current ? (
        <div style={{ color: "#64748b" }}>No card selected.</div>
      ) : (
        <div>
          <div style={{ color: "#475569", marginBottom: 8 }}>Say the word:</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
            {current.word} {current.ipa && <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={styles.ghost} onClick={() => speak(current.word)}>🔊 Model</button>
            {enableSR ? (
              <button style={styles.primary} onClick={startSR}>🎙️ Start recognition</button>
            ) : (
              <button style={styles.primary} onClick={() => alert('Enable Speech Recognition in Settings (Chrome recommended).')}>🎙️ Enable SR</button>
            )}
            <button style={styles.ghost} onClick={() => grade(true)}>✅ I nailed it</button>
            <button style={styles.ghost} onClick={() => grade(false)}>❌ Need work</button>
          </div>
        </div>
      )}
    </section>
  );
}