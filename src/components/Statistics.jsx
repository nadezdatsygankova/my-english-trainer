import React, { useMemo } from "react";

/**
 * <Statistics words, reviewLog />
 * - words: array of vocab entries
 * - reviewLog: [{ id, word, correct: boolean, date: 'YYYY-MM-DD' (UTC), mode }]
 */
export default function Statistics({ words = [], reviewLog = [] }) {
  // --- Helpers: force all day keys to UTC YYYY-MM-DD (match your stored r.date) ---
  const ymdUTC = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayKey = ymdUTC(new Date());

  const stats = useMemo(() => {
    const byDay = new Map();
    let correctTotal = 0, total = 0;

    // 1) Fold the log into byDay using r.date (already 'YYYY-MM-DD')
    for (const r of reviewLog) {
      const k = (r.date && r.date.length === 10) ? r.date : todayKey;
      const prev = byDay.get(k) || { total: 0, correct: 0 };
      prev.total += 1;
      if (r.correct) prev.correct += 1;
      byDay.set(k, prev);

      total += 1;
      if (r.correct) correctTotal += 1;
    }

    // 2) Build last 7 days (UTC)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      // shift by i days in UTC
      d.setUTCDate(d.getUTCDate() - i);
      const k = ymdUTC(d);
      const obj = byDay.get(k) || { total: 0, correct: 0 };
      last7.push({
        key: k,                                // 'YYYY-MM-DD'
        day: k.slice(5),                       // 'MM-DD'
        total: obj.total,
        correct: obj.correct,
        acc: obj.total ? Math.round((obj.correct * 100) / obj.total) : 0,
      });
    }

    // 3) Streak (UTC)
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const k = ymdUTC(d);
      const has = (byDay.get(k)?.total || 0) > 0;
      if (has) streak += 1; else break;
    }

    // 4) KPIs
    const today = byDay.get(todayKey) || { total: 0, correct: 0 };
    const mastered = words.filter((w) => (w.interval || 0) >= 30).length;

    const sixDaysAgoUTC = new Date();
    sixDaysAgoUTC.setUTCDate(sixDaysAgoUTC.getUTCDate() - 6);
    const addedThisWeek = words.filter((w) => {
      // prefer createdAt if present, else updated_at/date fields
      const s = w.createdAt || w.created_at || w.updated_at;
      if (!s) return false;
      const dt = new Date(s);
      // compare in UTC
      return dt >= sixDaysAgoUTC;
    }).length;

    return {
      todayCount: today.total,
      todayAcc: today.total ? Math.round((today.correct * 100) / today.total) : 0,
      streak,
      totalReviews: total,
      totalAcc: total ? Math.round((correctTotal * 100) / total) : 0,
      mastered,
      addedThisWeek,
      last7,
    };
  }, [reviewLog, words]);

  // tiny bar chart for last 7 days (pure CSS)
  const maxTotal = Math.max(1, ...stats.last7.map((d) => d.total));

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 12 }}>
        <KPI label="Today Reviews" value={stats.todayCount} sub={`${stats.todayAcc}% acc`} />
        <KPI label="7-day Streak" value={stats.streak} />
        <KPI label="Total Reviews" value={stats.totalReviews} sub={`${stats.totalAcc}% acc`} />
        <KPI label="Mastered (30d+)" value={stats.mastered} />
        <KPI label="Added This Week" value={stats.addedThisWeek} />
      </div>

      {/* Last 7 days chart */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Last 7 Days</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", alignItems: "end", gap: 8, height: 120, padding: "6px 2px 0" }}>
          {stats.last7.map((d) => (
            <div key={d.key} title={`${d.key} • ${d.total} reviews • ${d.acc}%`}>
              <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                {/* total bar */}
                <div
                  style={{
                    width: 18,
                    height: Math.round((d.total / maxTotal) * 86),
                    background: "#e2e8f0",
                    borderRadius: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* correct overlay */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: d.total
                        ? Math.round(((d.correct || 0) / d.total) * Math.round((d.total / maxTotal) * 86))
                        : 0,
                      background: "#6366f1",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{d.day.slice(3)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "#475569" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#e2e8f0", borderRadius: 3, marginRight: 6 }}></span>Total</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#6366f1", borderRadius: 3, marginRight: 6 }}></span>Correct</span>
        </div>
      </div>
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