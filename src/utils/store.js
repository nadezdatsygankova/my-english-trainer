// src/utils/store.js
const KEY = "els-v2"; // bump when schema changes

const DEFAULT = {
  version: 2,
  words: [],
  minimalPairs: [],
  settings: {
    enableSR: false,
    pictureOnly: false,
    targetSounds: ["ɪ vs iː", "θ vs ð"],
  },
  progress: 0,
  reviewLog: [],
};

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const data = JSON.parse(raw);

    // --- migrations ---
    if (!data.version) data.version = 1;

    // v1 -> v2: ensure word.modes exists
    if (data.version === 1) {
      data.words = (data.words || []).map((w) => ({
        modes: { flashcard: true, spelling: true },
        ...w,
        modes: w.modes ?? { flashcard: true, spelling: true },
      }));
      data.version = 2;
    }

    return { ...DEFAULT, ...data };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(state) {
  const copy = { ...state, version: 2 };
  localStorage.setItem(KEY, JSON.stringify(copy));
}

export function exportAll(state) {
  const blob = new Blob(
    [JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "english-trainer-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAll(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Invalid backup file.");
  // Future: validate keys strictly if you want.
  return data;
}