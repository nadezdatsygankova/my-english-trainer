// src/utils/scheduler.js

// Helper: local YYYY-MM-DD (avoids UTC off-by-one)
const formatLocalYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// --- Binary SM-2–style (legacy) ---
export function scheduleCard(prev = {}, wasCorrect) {
  const w = {
    interval: prev.interval ?? 0, // days
    ease: prev.ease ?? 2.5,       // EF
    reps: prev.reps ?? 0,
    lapses: prev.lapses ?? 0,
    ...prev,
  };

  if (!wasCorrect) {
    w.reps = 0;
    w.lapses = (w.lapses || 0) + 1;
    w.interval = 1;
    w.ease = Math.max(1.3, (w.ease || 2.5) - 0.2);
  } else {
    w.reps += 1;
    if (w.reps === 1) w.interval = 1;
    else if (w.reps === 2) w.interval = 3;
    else w.interval = Math.round((w.interval || 1) * (w.ease || 2.5));
    w.ease = Math.max(1.3, (w.ease || 2.5) + 0.02);
  }

  const due = new Date();
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + Math.max(1, w.interval));
  w.nextReview = formatLocalYMD(due);
  return w;
}

// --- Anki-like 4-grade scheduler ---
export function scheduleCard4(prev = {}, grade /* "again"|"hard"|"good"|"easy" */) {
  const clampEF = (ef) => Math.max(1.3, Math.min(3.5, ef));

  const w = {
    interval: prev.interval ?? 0,
    ease: prev.ease ?? 2.5,
    reps: prev.reps ?? 0,
    lapses: prev.lapses ?? 0,
    ...prev,
  };

  if (grade === "again") {
    w.reps = 0;
    w.lapses = (w.lapses || 0) + 1;
    w.ease = clampEF((w.ease || 2.5) - 0.3);
    w.interval = 1;
  } else if (grade === "hard") {
    w.reps = (w.reps || 0) + 1;
    w.ease = clampEF((w.ease || 2.5) - 0.15);
    if (w.reps === 1) w.interval = 1;
    else if (w.reps === 2) w.interval = 2;
    else w.interval = Math.max(1, Math.round((w.interval || 1) * (w.ease * 0.85)));
  } else if (grade === "good") {
    w.reps = (w.reps || 0) + 1;
    if (w.reps === 1) w.interval = 1;
    else if (w.reps === 2) w.interval = 3;
    else w.interval = Math.max(1, Math.round((w.interval || 1) * w.ease));
  } else if (grade === "easy") {
    w.reps = (w.reps || 0) + 1;
    w.ease = clampEF((w.ease || 2.5) + 0.15);
    if (w.reps <= 2) w.interval = 4;
    else w.interval = Math.max(2, Math.round((w.interval || 1) * (w.ease * 1.3)));
  } else {
    // If boolean slipped in, fall back to binary
    return scheduleCard(prev, !!grade);
  }

  const due = new Date();
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + Math.max(1, w.interval));
  w.nextReview = formatLocalYMD(due);
  return w;
}