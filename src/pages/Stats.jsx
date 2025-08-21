// src/pages/Stats.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Statistics from '../components/Statistics.jsx';
import { getReviewLog } from '../utils/reviews.js';
import { bus } from '../utils/bus.js';
import { supabase } from '../supabaseClient';
import { loadReviews } from '../utils/cloud';

function dedupeByKey(arr, keyFn) {
  const map = new Map();
  for (const it of arr) {
    map.set(keyFn(it), it);
  }
  return Array.from(map.values()).sort((a, b) => ((a.ts || a.date) > (b.ts || b.date) ? 1 : -1));
}

export default function StatsPage() {
  const [session, setSession] = useState(null);
  const [localLog, setLocalLog] = useState(() => getReviewLog());
  const [cloudLog, setCloudLog] = useState([]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Load cloud when logged in
  useEffect(() => {
    if (!session?.user) {
      setCloudLog([]);
      return;
    }
    loadReviews(session.user.id, { days: 60 })
      .then(setCloudLog)
      .catch(() => setCloudLog([]));
  }, [session?.user]);

  // Live local updates (when Trainer appends)
  useEffect(() => {
    const onChange = () => setLocalLog(getReviewLog());
    bus.addEventListener('review-log-changed', onChange);
    return () => bus.removeEventListener('review-log-changed', onChange);
  }, []);

  // Midnight rollover check
  useEffect(() => {
    const t = setInterval(() => setLocalLog(getReviewLog()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Merge cloud + local (prefer cloud if same (date+id+mode))
  const mergedLog = useMemo(() => {
    const key = (r) => `${r.date}|${r.id}|${r.mode}`;
    return dedupeByKey([...(cloudLog || []), ...(localLog || [])], key);
  }, [cloudLog, localLog]);

  const [words, setWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('words-v1') || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const onChange = () => {
      try {
        setWords(JSON.parse(localStorage.getItem('words-v1') || '[]'));
      } catch {}
    };
    bus.addEventListener('words-changed', onChange);
    return () => bus.removeEventListener('words-changed', onChange);
  }, []);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Statistics</h2>
        <button
          type="button"
          onClick={() => {
            setLocalLog(getReviewLog());
            if (session?.user)
              loadReviews(session.user.id, { days: 60 })
                .then(setCloudLog)
                .catch(() => {});
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
          }}>
          ↻ Refresh
        </button>
      </div>

      <Statistics words={words} reviewLog={mergedLog} />
    </section>
  );
}
