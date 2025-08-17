// Simplified SM-2 scheduler for words
export function scheduleCard(prev = {}, wasCorrect) {
  // defaults for a brand-new card
  const w = {
    interval: prev.interval ?? 0, // days
    ease: prev.ease ?? 2.5,       // 2.5 = default ease factor
    reps: prev.reps ?? 0,         // consecutive correct reps
    lapses: prev.lapses ?? 0,     // total wrongs
    ...prev
  };

  if (!wasCorrect) {
    w.reps = 0;
    w.lapses = (w.lapses || 0) + 1;
    w.interval = 1;
    w.ease = Math.max(1.3, (w.ease || 2.5) - 0.2); // clamp ease
  } else {
    w.reps += 1;
    if (w.reps === 1) w.interval = 1;
    else if (w.reps === 2) w.interval = 3;
    else w.interval = Math.round(w.interval * (w.ease || 2.5));

    w.ease = Math.max(1.3, (w.ease || 2.5) + 0.02); // tiny ease growth
  }

  const due = new Date();
  due.setDate(due.getDate() + Math.max(1, w.interval));
  w.nextReview = due.toISOString().slice(0, 10);

  return w;
}