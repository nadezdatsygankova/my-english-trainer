// src/components/GoalWidget.jsx
import React, { useEffect, useState } from 'react';
import { bus } from '../utils/bus';

const fmtYMD = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function readNum(key, def = 0) {
  const v = +localStorage.getItem(key);
  return Number.isFinite(v) ? v : def;
}
function writeNum(key, val) {
  localStorage.setItem(key, String(val));
}

function getTodayCounters() {
  const today = fmtYMD();
  return {
    lingqs: readNum(`lingqs-${today}`, 0),
    reviews: readNum(`reviews-${today}`, 0),
    goal: readNum('goal-lingqs-per-day', 13),
    today,
  };
}

function bumpStreakIfNeeded() {
  const today = fmtYMD();
  const lastDay = localStorage.getItem('streak-last-day') || '';
  let streak = readNum('streak-value', 0);
  if (lastDay !== today) {
    // only count a day if there was activity (lingqs or reviews)
    const hadActivity = readNum(`lingqs-${today}`, 0) > 0 || readNum(`reviews-${today}`, 0) > 0;
    if (hadActivity) {
      // if lastDay is exactly yesterday, continue streak; else reset to 1
      const yest = fmtYMD(new Date(Date.now() - 86400000));
      streak = lastDay === yest ? streak + 1 : 1;
      writeNum('streak-value', streak);
      localStorage.setItem('streak-last-day', today);
    }
  }
  return streak;
}

export default function GoalWidget() {
  const [state, setState] = useState(() => {
    const s = getTodayCounters();
    return { ...s, streak: readNum('streak-value', 0) };
  });

  useEffect(() => {
    const onLingq = () => {
      const { today } = getTodayCounters();
      const key = `lingqs-${today}`;
      writeNum(key, readNum(key) + 1);
      setState((s) => ({ ...getTodayCounters(), streak: bumpStreakIfNeeded() }));
    };

    const onReview = () => {
      const { today } = getTodayCounters();
      const key = `reviews-${today}`;
      writeNum(key, readNum(key) + 1);
      setState((s) => ({ ...getTodayCounters(), streak: bumpStreakIfNeeded() }));
    };

    bus.addEventListener('lingq-created', onLingq);
    bus.addEventListener('review-log-changed', onReview);

    // midnight tick (keep widget fresh if tab stays open)
    const timer = setInterval(() => {
      setState((s) => ({ ...getTodayCounters(), streak: readNum('streak-value', 0) }));
    }, 60000);

    return () => {
      bus.removeEventListener('lingq-created', onLingq);
      bus.removeEventListener('review-log-changed', onReview);
      clearInterval(timer);
    };
  }, []);

  const pct = Math.min(100, Math.round((state.lingqs / Math.max(1, state.goal)) * 100));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: 999,
        background: '#fff',
      }}>
      <span style={{ fontSize: 12, color: '#475569' }}>
        LingQs: <strong>{state.lingqs}</strong>/<strong>{state.goal}</strong>
      </span>
      <div
        style={{
          width: 80,
          height: 6,
          borderRadius: 999,
          background: '#e5e7eb',
          overflow: 'hidden',
        }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e' }} />
      </div>
      <span style={{ fontSize: 12, color: '#475569' }}>
        Reviews: <strong>{state.reviews}</strong>
      </span>
      <span style={{ fontSize: 12, color: '#475569' }}>
        Streak: 🔥 <strong>{state.streak}</strong>
      </span>
    </div>
  );
}
