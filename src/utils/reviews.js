// src/utils/reviews.js

// LocalStorage key
const KEY = "review-log-v1";

/**
 * Append a new review entry to localStorage.
 * Entry shape: { id, word, correct, date, mode }
 */
export function appendReview(entry) {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    arr.push({ ...entry });
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("appendReview failed", e);
  }
  return entry;
}

/**
 * Get the entire review log from localStorage.
 * @returns {Array<{id, word, correct:boolean, date:string, mode:string}>}
 */
export function getReviewLog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Clear the review log (for debugging or reset).
 */
export function clearReviewLog() {
  localStorage.removeItem(KEY);
}