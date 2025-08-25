// src/pages/Stats.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Statistics from '../components/Statistics.jsx';
import { getReviewLog } from '../utils/reviews.js';
import { bus } from '../utils/bus.js';
import { supabase } from '../utils/supabaseClient'; // keep your path if this works for you
import { loadReviews } from '../utils/cloud';

function dedupeByKey(arr, keyFn) {
  const map = new Map();
  for (const it of arr) map.set(keyFn(it), it);
  // stable-ish sort by ts/date ascending
  return Array.from(map.values()).sort((a, b) => {
    const aa = a.ts || a.date || '';
    const bb = b.ts || b.date || '';
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  });
}

export default function StatsPage() {
  const [session, setSession] = useState(null);

  // --- review logs: local + cloud ---
  const [localLog, setLocalLog] = useState(() => getReviewLog());
  const [cloudLog, setCloudLog] = useState([]);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // load cloud on login / change
  useEffect(() => {
    if (!session?.user) {
      setCloudLog([]);
      return;
    }
    loadReviews(session.user.id, { days: 60 })
      .then(setCloudLog)
      .catch(() => setCloudLog([]));
  }, [session?.user]);

  // live updates from Trainer / Spelling
  useEffect(() => {
    const refreshLocal = () => setLocalLog(getReviewLog());
    bus.addEventListener('review-log-changed', refreshLocal);
    return () => bus.removeEventListener('review-log-changed', refreshLocal);
  }, []);

  // refresh on tab focus and cross-tab storage changes
  useEffect(() => {
    const refreshAll = () => {
      setLocalLog(getReviewLog());
      try { setWords(JSON.parse(localStorage.getItem('words-v1') || '[]')); } catch {}
    };
    const onVis = () => { if (document.visibilityState === 'visible') refreshAll(); };
    const onStorage = (e) => {
      if (e.key === 'reviewLog-v1' || e.key === 'words-v1') refreshAll();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // midnight rollover timer
  useEffect(() => {
    const t = setInterval(() => setLocalLog(getReviewLog()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // merge cloud+local (prefer cloud on same date|id|mode)
  const mergedLog = useMemo(() => {
    const key = (r) => `${r.date}|${r.id}|${r.mode}`;
    return dedupeByKey([...(cloudLog || []), ...(localLog || [])], key);
  }, [cloudLog, localLog]);

  // --- words (for counts/mastered/upcoming) ---
  const [words, setWords] = useState(() => {
    try { return JSON.parse(localStorage.getItem('words-v1') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    const onChange = () => {
      try { setWords(JSON.parse(localStorage.getItem('words-v1') || '[]')); }
      catch {}
    };
    // listen to BOTH names to be safe
    bus.addEventListener('words-updated', onChange);
    bus.addEventListener('words-changed', onChange);
    return () => {
      bus.removeEventListener('words-updated', onChange);
      bus.removeEventListener('words-changed', onChange);
    };
  }, []);

  const manualRefresh = async () => {
    setLocalLog(getReviewLog());
    try { setWords(JSON.parse(localStorage.getItem('words-v1') || '[]')); } catch {}
    if (session?.user) {
      try {
        const cloud = await loadReviews(session.user.id, { days: 60 });
        setCloudLog(cloud);
      } catch {}
    }
  };

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Statistics</h2>
        <button
          type="button"
          onClick={manualRefresh}
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