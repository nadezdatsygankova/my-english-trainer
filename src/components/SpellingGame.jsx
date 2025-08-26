// src/components/SpellingGame.jsx
import React, { useMemo, useRef, useState } from 'react';
import styles from '../styles';

export default function SpellingGame({ words = [], onCorrect, onIncorrect }) {
  const [i, setI] = useState(0);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null); // {type:'good'|'close'|'bad', text:string}
  const timerRef = useRef(null);

  const pool = useMemo(() => words || [], [words]);
  const current = pool[i] || null;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const next = () => {
    setInput('');
    setMsg(null);
    if (pool.length) setI((x) => (x + 1) % pool.length);
  };

  const check = () => {
    if (!current) return;
    const guess = (input || '').trim().toLowerCase();
    const target = String(current.word || '')
      .trim()
      .toLowerCase();
    clearTimer();

    if (!guess) {
      setMsg({ type: 'bad', text: 'Type your answer above.' });
      return;
    }

    if (guess === target) {
      setMsg({ type: 'good', text: 'Correct! Amazing! 🎉' });
      onCorrect?.(current);
      // auto-advance after a quick celebration
      timerRef.current = setTimeout(() => {
        next();
      }, 900);
    } else {
      // simple “close” hint if one letter off
      const distance = levenshtein(guess, target);
      if (distance <= 2) {
        setMsg({ type: 'close', text: `Almost! (${distance} letter off)` });
      } else {
        setMsg({ type: 'bad', text: 'Not quite. Check your spelling.' });
      }
      onIncorrect?.(current);
    }
  };

  const giveUp = () => {
    if (!current) return;
    setMsg({ type: 'bad', text: `Answer: ${current.word}` });
  };

  const onEnter = (e) => {
    if (e.key === 'Enter') check();
  };

  if (!current) {
    return (
      <section style={styles.card}>
        <div style={styles.h2}>Spelling Practice</div>
        <div style={{ color: '#64748b' }}>No words available for spelling.</div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <div style={styles.h2}>Spelling Practice</div>
      <div style={{ fontSize: 13, color: '#475569' }}>Type the English word for:</div>

      {/* prompt (translation / mnemonic / image if available) */}
      <div style={{ marginTop: 8 }}>
        {current.translation ? (
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {current.translation}
          </div>
        ) : (
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {current.mnemonic || '—'}
          </div>
        )}
        {current.imageUrl && (
          <img
            src={current.imageUrl}
            alt={current.word}
            style={{
              width: '100%',
              maxHeight: 160,
              objectFit: 'cover',
              borderRadius: 12,
              marginTop: 8,
            }}
          />
        )}
      </div>

      {/* input row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
          placeholder="Type the word…"
          style={{
            flex: 1,
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 16,
          }}
        />
        <button type="button" style={styles.primary} onClick={check}>
          Check
        </button>
        <button type="button" style={styles.ghost} onClick={giveUp}>
          Give up
        </button>
      </div>

      {/* feedback */}
      {msg && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: 700,
            color:
              msg.type === 'good'
                ? '#059669' // green
                : msg.type === 'close'
                ? '#6366f1' // indigo
                : '#dc2626', // red
          }}>
          {msg.text}
        </div>
      )}

      {/* tiny footer */}
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
        Press Enter to check • You can reveal with “Give up”
      </div>
    </section>
  );
}

/* tiny Levenshtein for “close” feedback */
function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

