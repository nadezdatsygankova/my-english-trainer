// src/components/DebugPanel.jsx
import React from "react";

export default function DebugPanel({ session, lastOp, lastError, onPing, onTestInsert, onLoad }) {
  const pill = (txt, bg) => (
    <span style={{
      padding: "2px 8px", borderRadius: 999, background: bg, color: "#fff",
      fontSize: 12, fontWeight: 700, marginRight: 6
    }}>{txt}</span>
  );

  return (
    <div style={{
      position: "fixed", left: 12, bottom: 12, zIndex: 9999,
      background: "#0f172a", color: "#e2e8f0", borderRadius: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      padding: 12, maxWidth: 380
    }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <strong>Debug</strong>
        {session?.user ? pill("signed in", "#10b981") : pill("anon", "#6b7280")}
        {lastOp ? pill(lastOp, "#6366f1") : null}
      </div>

      <div style={{ fontSize: 12, opacity: .9, marginBottom: 6 }}>
        {session?.user?.email ? `User: ${session.user.email}` : "No Supabase session"}
      </div>

      {lastError && (
        <div style={{ fontSize: 12, color: "#fecaca", marginBottom: 8 }}>
          {String(lastError)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onPing} style={btn}>Ping</button>
        <button onClick={onLoad} style={btn}>Load Words</button>
        <button onClick={onTestInsert} style={btn}>Test Insert</button>
      </div>
    </div>
  );
}

const btn = {
  background: "#111827", color: "#e5e7eb", border: "1px solid #374151",
  borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12
};