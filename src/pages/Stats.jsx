// src/pages/Stats.jsx
import React, { useEffect, useMemo, useState } from "react";
import Statistics from "../components/Statistics.jsx";

const KEY = "reviewLog-v1";

function safeLoad() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export default function Stats() {
  const [reviewLog, setReviewLog] = useState(() => safeLoad());
  const [words, setWords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("words-v1") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const onStorage = (e) => {
      if (e && e.key && e.key !== KEY) return;
      setReviewLog(safeLoad());
      try { setWords(JSON.parse(localStorage.getItem("words-v1") || "[]")); } catch {}
    };

    // Cross-tab updates
    window.addEventListener("storage", onStorage);
    // Same-tab updates (our custom event)
    const onCustom = () => onStorage({ key: KEY });
    window.addEventListener("reviewLogUpdated", onCustom);

    // Initial sync in case something wrote before this mounted
    onStorage({ key: KEY });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("reviewLogUpdated", onCustom);
    };
  }, []);

  // Debug slice
  const last5 = useMemo(() => reviewLog.slice(-5).reverse(), [reviewLog]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Statistics</h1>

      <div style={{
        padding: 12, border: "1px solid #eef2f7", borderRadius: 12, background: "#fff",
        boxShadow: "0 4px 14px rgba(15,23,42,.04)"
      }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Summary
        </div>
        {/* Your existing KPIs + chart via the component */}
        <Statistics words={words} reviewLog={reviewLog} />
      </div>

      <div style={{
        padding: 12, border: "1px solid #eef2f7", borderRadius: 12, background: "#fff"
      }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          Debug: last 5 reviews (newest first)
        </div>
        {last5.length === 0 ? (
          <div style={{ color: "#64748b" }}>No reviews yet. Go to Trainer and grade a card or try Spelling.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {last5.map((r, i) => (
              <li key={i} style={{ fontSize: 13, color: "#334155" }}>
                {r.date} — <strong>{r.word}</strong> • {r.mode} • {r.correct ? "✅" : "❌"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
