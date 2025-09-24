// src/components/HabitCard.jsx
import React from "react";
import styles from "../styles";

export default function HabitCard({ habit, todayLog, onToggle }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>{habit.name}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {habit.category} • {habit.frequency}
        </div>
      </div>
      <button
        style={{
          ...styles.primary,
          background: todayLog?.completed ? "#22c55e" : "#3b82f6",
        }}
        onClick={() => onToggle(habit)}
      >
        {todayLog?.completed ? "✓ Done" : "Mark done"}
      </button>
    </div>
  );
}