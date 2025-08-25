// src/components/Statistics.jsx
import React, { useMemo } from "react";

/**
 * <Statistics words reviewLog />
 * words: [{ id, word, interval, reps, ease, nextReview, createdAt, ... }]
 * reviewLog: [{ id, word, correct: boolean, date: 'YYYY-MM-DD', mode }]
 */
export default function Statistics({ words = [], reviewLog = [] }) {
  const stats = useMemo(() => {
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const dayKey = (d) => startOfDay(d).toISOString().slice(0,10);
    const today = startOfDay(new Date());
    const todayKey = dayKey(today);

    // ---------- Reviews (done) ----------
    const byDay = new Map();
    let totalReviews = 0, totalCorrect = 0;

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
        day: k.slice(5), // MM-DD
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

    // ---------- Due counts (from words) ----------
    const withNext = (words || []).filter(w => !!w?.nextReview);
    const dueTodayCount = withNext.filter(w => startOfDay(new Date(w.nextReview)) <= today).length;
    const futureDueTotal = withNext.filter(w => startOfDay(new Date(w.nextReview)) > today).length;

    // Next 7 days breakdown (excluding today)
    const upcoming7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1));
      const k = dayKey(d);
      const count = withNext.filter(w => dayKey(new Date(w.nextReview)) === k).length;
      return { date: k, label: k.slice(5), count };
    });

    // ---------- Card counts (Anki-like buckets) ----------
    // New: reps == 0 (or interval == 0)
    // Learning: interval < 21 and reps > 0
    // Mature: interval >= 21
    const totalWords = words.length;
    const newCount = words.filter(w => (w.reps || 0) === 0 || (w.interval || 0) === 0).length;
    const matureCount = words.filter(w => (w.interval || 0) >= 21).length;
    const learningCount = Math.max(0, totalWords - newCount - matureCount);

    // ---------- Review Intervals distribution (current) ----------
    // buckets by current interval (days)
    const buckets = [
      { key: "1",       test: d => d === 1 },
      { key: "2",       test: d => d === 2 },
      { key: "3",       test: d => d === 3 },
      { key: "4–7",     test: d => d >= 4  && d <= 7 },
      { key: "8–14",    test: d => d >= 8  && d <= 14 },
      { key: "15–30",   test: d => d >= 15 && d <= 30 },
      { key: "31–90",   test: d => d >= 31 && d <= 90 },
      { key: "91+",     test: d => d >= 91 },
    ];
    const hist = buckets.map(b => ({
      label: b.key,
      count: words.filter(w => b.test(Math.max(0, Math.round(w.interval || 0)))).length,
    }));
    const maxHist = Math.max(1, ...hist.map(h => h.count));

    // ---------- Added (last 30 days) ----------
    const days30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const count = words.filter(w => w.createdAt && dayKey(new Date(w.createdAt)) === k).length;
      days30.push({ date: k, label: k.slice(5), count });
    }

    // ---------- True Retention (≈ mature reviews last 30 days) ----------
    // Approximation: take reviews in last 30 days and count only those whose word is currently mature.
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 30);
    const matureIds = new Set(words.filter(w => (w.interval || 0) >= 21).map(w => w.id));
    let trTotal = 0, trCorrect = 0;
    for (const r of reviewLog) {
      const when = r.date ? new Date(r.date) : today;
      if (when >= cutoff) {
        if (matureIds.has(r.id)) {
          trTotal += 1;
          if (r.correct) trCorrect += 1;
        }
      }
    }
    const trueRetention = trTotal ? Math.round((trCorrect * 100) / trTotal) : 0;

    return {
      // Reviews
      todayCount: todayDone.total,
      todayAcc: todayDone.total ? Math.round((todayDone.correct * 100) / todayDone.total) : 0,
      streak,
      totalReviews,
      totalAcc: totalReviews ? Math.round((totalCorrect * 100) / totalReviews) : 0,
      last7,

      // Due / future
      dueTodayCount,
      futureDueTotal,
      upcoming7,

      // Cards
      totalWords,
      newCount,
      learningCount,
      matureCount,

      // Intervals
      hist,
      maxHist,

      // Added & TR
      days30,
      trueRetention,
    };
  }, [words, reviewLog]);

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 12 }}>
        <KPI label="Today Reviews" value={stats.todayCount} sub={`${stats.todayAcc}% acc`} />
        <KPI label="Due Today (cards)" value={stats.dueTodayCount} />
        <KPI label="Future Due" value={stats.futureDueTotal} />
        <KPI label="7-day Streak" value={stats.streak} />
        <KPI label="Total Reviews" value={stats.totalReviews} sub={`${stats.totalAcc}% acc`} />
        <KPI label="True Retention (30d, mature)" value={`${stats.trueRetention}%`} />
      </div>

      {/* Card Counts */}
      <Section title="Card Counts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <Mini label="All words" value={stats.totalWords} />
          <Mini label="New" value={stats.newCount} />
          <Mini label="Learning" value={stats.learningCount} />
          <Mini label="Mature (≥21d)" value={stats.matureCount} />
        </div>
      </Section>

      {/* Review Intervals distribution */}
      <Section title="Review Intervals (current)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", alignItems: "end", gap: 8, height: 120, padding: "6px 2px 0" }}>
          {stats.hist.map(h => (
            <div key={h.label} title={`${h.label} • ${h.count}`}>
              <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                <div style={{
                  width: 20,
                  height: Math.round((h.count / stats.maxHist) * 86),
                  background: "#e2e8f0",
                  borderRadius: 6
                }} />
                <div style={{ fontSize: 10, color: "#64748b" }}>{h.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Reviews done: Last 7 days (keep your original if you prefer) */}
      <Section title="Reviews (last 7 days)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", alignItems: "end", gap: 8, height: 120, padding: "6px 2px 0" }}>
          {stats.last7.map((d) => {
            const maxTotal = Math.max(1, ...stats.last7.map(x => x.total));
            const barH = Math.round((d.total / maxTotal) * 86);
            const corrH = d.total ? Math.round((d.correct / d.total) * barH) : 0;
            return (
              <div key={d.day} title={`${d.day} • ${d.total} reviews • ${d.acc}%`}>
                <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                  <div style={{ width: 18, height: barH, background: "#e2e8f0", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: corrH, background: "#6366f1" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{d.day.slice(3)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "#475569" }}>
          <Legend swatch="#e2e8f0" label="Total" />
          <Legend swatch="#6366f1" label="Correct" />
        </div>
      </Section>

      {/* Upcoming next 7 days */}
      <Section title="Upcoming (next 7 days)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
          {stats.upcoming7.map(d => (
            <div key={d.date} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, textAlign: "center", background: "#fff" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{d.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{d.count}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Added last 30 days */}
      <Section title="Added (last 30 days)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(15,1fr)", gap: 4, alignItems: "end", height: 100 }}>
          {stats.days30.map(d => {
            const maxAdd = Math.max(1, ...stats.days30.map(x => x.count));
            const h = Math.round((d.count / maxAdd) * 80);
            return (
              <div key={d.date} title={`${d.label} • added ${d.count}`} style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: h, background: "#94a3b8", borderRadius: 4 }} />
                {/* show label every 3rd day to avoid clutter */}
                <div style={{ fontSize: 9, color: "#94a3b8", visibility: (new Date(d.date).getDate() % 3 === 0) ? "visible" : "hidden" }}>
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function KPI({ label, value, sub }) {
  return (
    <div style={{
      padding: 12,
      border: "1px solid #eef2f7",
      borderRadius: 12,
      background: "#fff",
      boxShadow: "0 4px 14px rgba(15,23,42,.04)"
    }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>}
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div style={{
      padding: 10,
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      background: "#fff",
      display: "grid",
      gap: 4
    }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      {children}
    </section>
  );
}

function Legend({ swatch, label }) {
  return (
    <span>
      <span style={{ display: "inline-block", width: 10, height: 10, background: swatch, borderRadius: 3, marginRight: 6 }} />
      {label}
    </span>
  );
}
