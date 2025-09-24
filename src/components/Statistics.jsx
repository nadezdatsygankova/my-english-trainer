// src/components/Statistics.jsx
import React, { useMemo } from 'react';

export default function Statistics({ words = [], reviewLog = [] }) {
  const stats = useMemo(() => {
    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const dayKey = (d) => startOfDay(d).toISOString().slice(0, 10);
    const today = startOfDay(new Date());
    const todayKey = dayKey(today);

    const byDay = new Map();
    let totalReviews = 0,
      totalCorrect = 0;

    for (const r of reviewLog) {
      const k = r.date || todayKey;
      const prev = byDay.get(k) || { total: 0, correct: 0 };
      prev.total += 1;
      prev.correct += r.correct ? 1 : 0;
      byDay.set(k, prev);
      totalReviews += 1;
      if (r.correct) totalCorrect += 1;
    }

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const obj = byDay.get(k) || { total: 0, correct: 0 };
      last7.push({
        day: k.slice(5),
        total: obj.total,
        correct: obj.correct,
        acc: obj.total ? Math.round((obj.correct * 100) / obj.total) : 0,
      });
    }

    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const has = (byDay.get(k)?.total || 0) > 0;
      if (has) streak++;
      else break;
    }

    const todayDone = byDay.get(todayKey) || { total: 0, correct: 0 };

    const withNext = (words || []).filter((w) => !!w?.nextReview);
    const dueTodayCount = withNext.filter(
      (w) => startOfDay(new Date(w.nextReview)) <= today,
    ).length;
    const futureDueTotal = withNext.filter(
      (w) => startOfDay(new Date(w.nextReview)) > today,
    ).length;

    const upcoming7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1));
      const k = dayKey(d);
      const count = withNext.filter((w) => dayKey(new Date(w.nextReview)) === k).length;
      return { date: k, label: k.slice(5), count };
    });

    const totalWords = words.length;
    const newCount = words.filter((w) => (w.reps || 0) === 0 || (w.interval || 0) === 0).length;
    const matureCount = words.filter((w) => (w.interval || 0) >= 21).length;
    const learningCount = Math.max(0, totalWords - newCount - matureCount);

    const buckets = [
      { key: '1', test: (d) => d === 1 },
      { key: '2', test: (d) => d === 2 },
      { key: '3', test: (d) => d === 3 },
      { key: '4–7', test: (d) => d >= 4 && d <= 7 },
      { key: '8–14', test: (d) => d >= 8 && d <= 14 },
      { key: '15–30', test: (d) => d >= 15 && d <= 30 },
      { key: '31–90', test: (d) => d >= 31 && d <= 90 },
      { key: '91+', test: (d) => d >= 91 },
    ];
    const hist = buckets.map((b) => ({
      label: b.key,
      count: words.filter((w) => b.test(Math.max(0, Math.round(w.interval || 0)))).length,
    }));
    const maxHist = Math.max(1, ...hist.map((h) => h.count));

    const days30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const count = words.filter((w) => w.createdAt && dayKey(new Date(w.createdAt)) === k).length;
      days30.push({ date: k, label: k.slice(5), count });
    }

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 30);
    const matureIds = new Set(words.filter((w) => (w.interval || 0) >= 21).map((w) => w.id));
    let trTotal = 0,
      trCorrect = 0;
    for (const r of reviewLog) {
      const when = r.date ? new Date(r.date) : today;
      if (when >= cutoff && matureIds.has(r.id)) {
        trTotal += 1;
        if (r.correct) trCorrect += 1;
      }
    }
    const trueRetention = trTotal ? Math.round((trCorrect * 100) / trTotal) : 0;

    return {
      todayCount: todayDone.total,
      todayAcc: todayDone.total ? Math.round((todayDone.correct * 100) / todayDone.total) : 0,
      streak,
      totalReviews,
      totalAcc: totalReviews ? Math.round((totalCorrect * 100) / totalReviews) : 0,
      last7,
      dueTodayCount,
      futureDueTotal,
      upcoming7,
      totalWords,
      newCount,
      learningCount,
      matureCount,
      hist,
      maxHist,
      days30,
      trueRetention,
    };
  }, [words, reviewLog]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>📊 Daily Statistics</h2>
      <ul>
        <li>
          Reviews today: {stats.todayCount} ({stats.todayAcc}% correct)
        </li>
        <li>Current streak: {stats.streak} days</li>
        <li>
          Total reviews: {stats.totalReviews} ({stats.totalAcc}% correct)
        </li>
        <li>True Retention (30d): {stats.trueRetention}%</li>
        <li>
          Words: {stats.totalWords} (New: {stats.newCount}, Learning: {stats.learningCount}, Mature:{' '}
          {stats.matureCount})
        </li>
        <li>
          Due today: {stats.dueTodayCount}, Future due: {stats.futureDueTotal}
        </li>
      </ul>
    </div>
  );
}
