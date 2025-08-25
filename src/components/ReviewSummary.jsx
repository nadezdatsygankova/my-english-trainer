import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { loadWords as cloudLoadWords } from "../utils/cloud"; // you already have this

// same YYYY-MM-DD helper used elsewhere
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ReviewSummary() {
  const [session, setSession] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // auth + load
  useEffect(() => {
    let unsub;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);

        // subscribe to auth changes so widget stays current
        const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
        unsub = () => sub.data?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore, we can still show local fallback
      } finally {
        // continue to load below
      }
    })();

    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (session?.user) {
          // cloud is source of truth
          const remote = await cloudLoadWords();
          if (!alive) return;
          setWords(remote || []);
        } else {
          // local fallback if not logged in
          try {
            const local = JSON.parse(localStorage.getItem("words-v1") || "[]");
            if (!alive) return;
            setWords(Array.isArray(local) ? local : []);
          } catch {
            if (!alive) return;
            setWords([]);
          }
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load words");
        setWords([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [session]);

  const today = todayISO();
  const total = words.length;
  const dueToday = useMemo(
    () =>
      words.filter(
        (w) =>
          w?.modes?.flashcard &&
          (!w.nextReview || w.nextReview <= today)
      ).length,
    [words, today]
  );

  return (
    <div style={{
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
      padding: 12,
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      background: "#fff",
      minHeight: 56
    }}>
      <Badge label="All words" value={loading ? "…" : total} />
      <Badge label="Due today" value={loading ? "…" : dueToday} highlight />
      {err && <span style={{ color:"#b91c1c", fontSize:12 }}>• {err}</span>}
    </div>
  );
}

function Badge({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      background: highlight ? "#eef2ff" : "#f1f5f9",
      color: highlight ? "#3730a3" : "#0f172a",
      border: `1px solid ${highlight ? "#c7d2fe" : "#e2e8f0"}`
    }}>
      <span style={{ fontSize: 12, opacity: .8 }}>{label}</span>
      <strong style={{ fontSize: 16 }}>{value}</strong>
    </div>
  );
}