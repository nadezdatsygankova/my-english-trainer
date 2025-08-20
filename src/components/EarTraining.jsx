import React from "react";
import styles from "../styles";


export default function EarTraining({ currentPair, speak, playPair, guessPair, mpMsg }) {
  return (
    <section style={styles.card}>
      <div style={styles.h2}>Ear Training (Minimal Pairs)</div>
      {!currentPair ? (
        <div style={{ color: "#64748b" }}>Add target sounds in Settings or import pairs to begin.</div>
      ) : (
        <div>
          <div style={{ color: "#475569", marginBottom: 6 }}>
            Focus: {currentPair.focus} <span style={{ color: "#94a3b8" }}> {currentPair.ipa}</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <button style={styles.primary} onClick={playPair}>▶ Play</button>
            <button style={styles.ghost} onClick={() => speak(currentPair.a)}>{currentPair.a}</button>
            <button style={styles.ghost} onClick={() => speak(currentPair.b)}>{currentPair.b}</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button style={styles.ghost} onClick={() => guessPair("a")}>I heard: {currentPair.a}</button>
            <button style={styles.ghost} onClick={() => guessPair("b")}>I heard: {currentPair.b}</button>
          </div>
          {mpMsg && (
            <div style={{ marginTop: 8 }}>
              {mpMsg.type === "good" && <span style={styles.badgeGood}>{mpMsg.text}</span>}
              {mpMsg.type === "bad" && <span style={styles.badgeBad}>{mpMsg.text}</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}