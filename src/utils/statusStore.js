const STATUS_KEY = "wordStatus-v1";
const LESSON_KEY = "readerLessons-v1";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Failed to persist data", err);
  }
}

export function getStatuses() {
  return load(STATUS_KEY, {}); // { "word": "unknown|learning|known|ignored" }
}
export function setStatus(wordKey, status) {
  const map = getStatuses();
  map[wordKey] = status;
  save(STATUS_KEY, map);
  return map;
}
export function bulkSetStatus(entries) {
  const map = getStatuses();
  for (const [k, v] of entries) map[k] = v;
  save(STATUS_KEY, map);
  return map;
}

export function getLessons() {
  return load(LESSON_KEY, []); // [{id, title, text, createdAt}]
}
export function addLesson(title, text) {
  const list = getLessons();
  const id = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const item = { id, title: title || "Untitled", text, createdAt: new Date().toISOString() };
  list.unshift(item);
  save(LESSON_KEY, list);
  return item;
}
export function deleteLesson(id) {
  const list = getLessons().filter(l => l.id !== id);
  save(LESSON_KEY, list);
  return list;
}
