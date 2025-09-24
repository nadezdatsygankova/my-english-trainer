// src/utils/books.js
import { supabase } from "./supabaseClient.js";
import { uid } from "./index.js";

/*
DB expectations (what we SELECT/INSERT):
  table: books
    id uuid default gen_random_uuid()
    user_id uuid not null
    title text not null
    author text
    cover_url text
    pages_total int
    progress_pages int default 0
    progress_percent numeric GENERATED ALWAYS (or computed)  <-- DO NOT write on insert/upsert
    added_at timestamptz default now()

  table: notes
    id uuid default gen_random_uuid()
    user_id uuid not null
    book_id uuid not null
    text text not null
    created_at timestamptz default now()

  table: reading_sessions
    id uuid default gen_random_uuid()
    user_id uuid not null
    book_id uuid not null
    date date not null
    minutes int default 0
    pages int default 0
*/

/* ------------------------- BOOKS ------------------------- */

export async function loadBooks(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("books")
    .select(
      "id,user_id,title,author,cover_url,pages_total,progress_pages,progress_percent,added_at"
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertBook(userId, book) {
  if (!userId) return book;

  // Always send a UUID id (DB is not generating one)
  const id = book.id || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  const payload = {
    id,                       // ← ensure not null
    user_id: userId,
    title: book.title,
    author: book.author || null,
    cover_url: book.coverUrl || null,
    pages_total: book.totalPages ?? null,
    progress_pages: book.progressPages ?? null,
    // DO NOT send progress_percent (generated/computed in DB if you have it)
    added_at: book.addedAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("books")
    .upsert(payload)
    .select("id,user_id,title,author,cover_url,pages_total,progress_pages,progress_percent,added_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(userId, id) {
  if (!userId || !id) return;

  // Delete child rows first (if no FK cascade)
  const delNotes = supabase.from("notes").delete().eq("user_id", userId).eq("book_id", id);
  const delSessions = supabase
    .from("reading_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", id);

  const [nRes, sRes] = await Promise.all([delNotes, delSessions]);
  if (nRes.error) throw nRes.error;
  if (sRes.error) throw sRes.error;

  const { error } = await supabase.from("books").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

/* ------------------------- NOTES ------------------------- */

export async function loadNotes(userId, bookId) {
  if (!userId || !bookId) return [];
  const { data, error } = await supabase
    .from("notes")
    .select("id,user_id,book_id,text,created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addNote(userId, bookId, text) {
  if (!userId || !bookId || !text?.trim()) return null;

  // Let DB generate id
  const insert = {
    user_id: userId,
    book_id: bookId,
    text: text.trim(),
  };

  const { data, error } = await supabase
    .from("notes")
    .insert(insert)
    .select("id,user_id,book_id,text,created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(userId, id) {
  if (!userId || !id) return;
  const { error } = await supabase.from("notes").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

/* ---------------------- READING SESSIONS ---------------------- */

export async function loadSessions(userId, bookId) {
  if (!userId || !bookId) return [];
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("id,user_id,book_id,date,minutes,pages")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addSession(userId, bookId, { date, minutes = 0, pages = 0 } = {}) {
  if (!userId || !bookId) return null;

  const d =
    date ||
    new Date().toISOString().slice(0, 10); // YYYY-MM-DD (date column, not timestamptz)

  const insert = {
    user_id: userId,
    book_id: bookId,
    date: d,
    minutes: Number(minutes) || 0,
    pages: Number(pages) || 0,
  };

  const { data, error } = await supabase
    .from("reading_sessions")
    .insert(insert)
    .select("id,user_id,book_id,date,minutes,pages")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSession(userId, id) {
  if (!userId || !id) return;
  const { error } = await supabase
    .from("reading_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}