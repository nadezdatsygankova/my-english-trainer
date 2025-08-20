import React from "react";
import styles from "../styles";

export default function SettingsModal({ open, onClose, targetSounds, setTargetSounds, enableSR, setEnableSR, pictureOnly, setPictureOnly }) {
  if (!open) return null;
  const groups = ["ɪ vs iː","ʊ vs uː","æ vs e","r vs l","θ vs ð","k vs g","f vs v"];
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal} className="scale-in" role="dialog" aria-modal="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...styles.h2, margin: 0 }}>Settings</div>
          <button style={styles.ghost} onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Target sounds (Ear Training)</div>
            {groups.map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={targetSounds.includes(s)}
                  onChange={(e) => {
                    setTargetSounds((prev) =>
                      e.target.checked ? [...new Set([...prev, s])] : prev.filter(x => x !== s)
                    );
                  }}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>General</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={enableSR} onChange={(e) => setEnableSR(e.target.checked)} /> Enable Speech Recognition (Chrome recommended)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={pictureOnly} onChange={(e) => setPictureOnly(e.target.checked)} /> Picture-only flashcard recall (if image exists)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}