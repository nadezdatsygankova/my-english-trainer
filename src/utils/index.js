// src/utils/index.js

// Simple unique ID generator
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Local ISO date YYYY-MM-DD
export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
