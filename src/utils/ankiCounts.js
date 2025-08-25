// src/utils/ankiCounts.js
export const todayKey = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const isDueToday = (w) => {
  const due = (w.nextReview || "").slice(0, 10);
  return !!due && due <= todayKey();
};

const isNew = (w) => (w.reps || 0) === 0;

const getDailyState = () => {
  const key = todayKey();
  try {
    const raw = JSON.parse(localStorage.getItem("ankiDaily") || "{}");
    if (!raw.key || raw.key !== key) {
      return { key, shownReviews: 0, shownNew: 0 };
    }
    return raw;
  } catch {
    return { key, shownReviews: 0, shownNew: 0 };
  }
};

const setDailyState = (state) =>
  localStorage.setItem("ankiDaily", JSON.stringify(state));

/**
 * Compute today's Anki-like counts.
 * @param {Array} words - your vocab array
 * @param {Object} opts - { maxReviewsPerDay, newCardsPerDay, filters? }
 *   filters: { category: 'all'|'noun'..., difficulty: 'all'|'easy'... }
 */
export function getAnkiCounts(words = [], opts = {}) {
  const {
    maxReviewsPerDay = 200,
    newCardsPerDay = 20,
    filters = { category: "all", difficulty: "all" },
  } = opts;

  const passesFilters = (w) =>
    (w.modes?.flashcard !== false) &&
    (filters.category === "all" || (w.category || "noun") === filters.category) &&
    (filters.difficulty === "all" || (w.difficulty || "easy") === filters.difficulty);

  const pool = words.filter(passesFilters);

  const due = pool.filter(isDueToday);
  const newPool = pool.filter(isNew);

  // What’s already shown today
  const daily = getDailyState();

  // Reviews left allowed by cap
  const reviewsCapLeft = Math.max(0, maxReviewsPerDay - daily.shownReviews);
  const reviewsDueToday = Math.min(due.length, reviewsCapLeft);

  // Backlog = due that won’t be shown because of cap
  const reviewBacklog = Math.max(0, due.length - reviewsCapLeft);

  // New left allowed by cap
  const newCapLeft = Math.max(0, newCardsPerDay - daily.shownNew);
  const newToday = Math.min(newPool.length, newCapLeft);

  return {
    key: todayKey(),
    totals: {
      all: pool.length,
      dueAll: due.length,
      newAll: newPool.length,
    },
    today: {
      reviewsCap: maxReviewsPerDay,
      newCap: newCardsPerDay,
      reviewsDueToday,   // what you'll actually be shown today
      reviewBacklog,     // extra overdue pushed to future days
      newToday,          // new that will be introduced today
    },
    _dailyInternal: daily, // optional debug
  };
}

/**
 * Call this right after you grade a card.
 * @param {'review'|'new'} type
 * In your app, call with 'review' when a card had reps>0 (or not new),
 * and 'new' when a card had reps===0 before grading.
 */
export function bumpDailyShown(type) {
  const daily = getDailyState();
  if (type === "review") daily.shownReviews += 1;
  else if (type === "new") daily.shownNew += 1;
  setDailyState(daily);
}

/** Reset at midnight or a manual “reset today” button (optional) */
export function resetDailyCounters() {
  setDailyState({ key: todayKey(), shownReviews: 0, shownNew: 0 });
}