// src/utils/cloud.js
import { supabase } from "../supabaseClient";

/* ------- helpers ------- */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

// keep only defined keys
function compact(obj) {
  const out = {};
  for (const k in obj) {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// normalize YYYY-MM-DD
function asDateYYYYMMDD(d) {
  if (!d) return null;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const iso = new Date(d).toISOString();
    return iso.slice(0, 10);
  } catch {
    return null;
  }
}

/** DB (snake_case) -> App (camelCase) */
function fromDb(row = {}) {
  return {
    id: row.id,
    user_id: row.user_id ?? null,

    word: row.word ?? "",
    translation: row.translation ?? "",
    category: row.category ?? "noun",
    difficulty: row.difficulty ?? "medium",

    interval: row.interval ?? 0,
    ease: row.ease ?? 2.5,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,

    nextReview: row.next_review ?? null,
    createdAt: row.created_at ?? null,
    updated_at: row.updated_at ?? null,

    modes: row.modes ?? { flashcard: true, spelling: true },

    ipa: row.ipa ?? "",
    mnemonic: row.mnemonic ?? "",
    imageUrl: row.image_url ?? "",
    example: row.example ?? "",
  };
}

/** App (camelCase) -> DB (snake_case) */
function toDb(w = {}, userId = null) {
  const row = {
    // id: only include if valid UUID; otherwise let DB default
    id: isUuid(w.id) ? w.id : undefined,

    // user_id: include if valid UUID; some schemas require it via RLS
    user_id: isUuid(userId) ? userId : (isUuid(w.user_id) ? w.user_id : undefined),

    word: w.word,
    translation: w.translation,
    category: w.category,
    difficulty: w.difficulty,

    interval: w.interval ?? 0,
    ease: w.ease ?? 2.5,
    reps: w.reps ?? 0,
    lapses: w.lapses ?? 0,

    next_review: asDateYYYYMMDD(w.nextReview),

    // let DB set created_at; don’t send created_at at all
    created_at: undefined,

    // allow app to touch updated_at if you want, or omit to let triggers handle it
    updated_at: w.updated_at ?? new Date().toISOString(),

    modes: w.modes ?? { flashcard: true, spelling: true },

    ipa: w.ipa ?? "",
    mnemonic: w.mnemonic ?? "",
    image_url: w.imageUrl ?? "",
    example: w.example ?? "",
  };

  return compact(row);
}

/* ------- API ------- */

export async function loadWords() {
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .order("created_at", { ascending: false }); // snake_case in DB
  if (error) throw error;
  return (data || []).map(fromDb);
}

export async function upsertWord(userId, payload) {
  const row = toDb(payload, userId);
  const { data, error } = await supabase
    .from("words")
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data);
}

export async function deleteWord(id) {
  const { error } = await supabase.from("words").delete().eq("id", id);
  if (error) throw error;
}

export async function insertReview(userId, review) {
  const row = compact({
    id: isUuid(review.id) ? review.id : undefined,
    user_id: isUuid(userId) ? userId : undefined,
    word_id: review.word_id,               // must match your schema
    correct: !!review.correct,
    mode: review.mode || "flashcard",
    created_at: new Date().toISOString(),  // or omit if DB default exists
  });
  const { error } = await supabase.from("reviews").insert([row]);
  if (error) throw error;
}

/* ------- Debug helpers ------- */

export async function pingSupabase() {
  // confirms table + RLS access; returns { error, count }
  return supabase.from("words").select("id", { head: true, count: "exact" });
}

export async function testInsertWord(userId) {
  const sample = {
    // omit id to use DB default
    word: "debug_word",
    translation: "тест",
    category: "noun",
    difficulty: "easy",
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    nextReview: new Date().toISOString().slice(0, 10),
    // createdAt intentionally omitted (DB default)
    modes: { flashcard: true, spelling: true },
  };
  const row = toDb(sample, userId);
  const { data, error } = await supabase.from("words").insert([row]).select();
  if (error) throw error;
  return { data: (data || []).map(fromDb) };
}