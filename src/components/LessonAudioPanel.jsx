// src/components/LessonAudioPanel.jsx
import React, { useMemo, useRef } from 'react';
import styles from '../styles';

function splitIntoSentences(text = '') {
  // quick split; you can improve later
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function LessonAudioPanel({ text = '', audioUrl = '' }) {
  const audioRef = useRef(null);
  const sents = useMemo(() => splitIntoSentences(text), [text]);

  const speak = (t) => {
    try {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <section style={{ ...styles.card }}>
      <div style={styles.h2}>Audio</div>
      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%', marginTop: 8 }} />
      ) : (
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          No audio file. Using TTS.
        </div>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {sents.map((s, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
            <div style={{ color: '#0f172a' }}>{s}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.ghost} onClick={() => speak(s)} title="Play sentence (TTS)">
                🔊 Play
              </button>
              {/* Hook up audio seeking here later if you add timestamps */}
            </div>
          </div>
        ))}
        {sents.length === 0 && (
          <div style={{ color: '#64748b' }}>Paste lesson text to enable sentence list.</div>
        )}
      </div>
    </section>
  );
}
