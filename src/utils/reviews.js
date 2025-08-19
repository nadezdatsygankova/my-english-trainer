// src/utils/reviews.js
export function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Append a review entry and notify listeners.
 * entry: { id, word, correct: boolean, mode: 'flashcard'|'spelling', date?: 'YYYY-MM-DD' }
 */
export function appendReview(entry) {
  const key = "reviewLog-v1";
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}

  const withDate = { ...entry, date: entry.date || todayISO() };
  arr.push(withDate);

  const newValue = JSON.stringify(arr);
  localStorage.setItem(key, newValue);

  // Notify other parts of the app (same-tab + cross-tab)
  try {
    // Cross-tab: storage event fires automatically in other tabs
    // Same-tab: fire a custom event so listeners refresh immediately
    window.dispatchEvent(new CustomEvent("reviewLogUpdated", { detail: withDate }));
  } catch { /* no-op */ }
}