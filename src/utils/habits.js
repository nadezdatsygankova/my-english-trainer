// src/utils/habits.js
import { supabase } from "./supabaseClient.js";
import { uid } from "./index.js"; // make sure this exists and exports uid()

// --- Local storage keys ---
const LS_HABITS = "habits-v1";
const LS_LOGS = "habit-logs-v1"; // { [habitId]: { 'YYYY-MM-DD': { completed, value } } }

// --- Small helpers ---
const readLS = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb));
  } catch {
    return fb;
  }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const todayYMD = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const startOfWeek = (date, weekStartsOn = 1) => {
  // 1 = Monday
  const d = new Date(date);
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (day === 0 ? 7 : day) - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------- HABITS ----------
export async function loadHabits(userId) {
  if (!userId) return readLS(LS_HABITS, []);

  const { data, error } = await supabase
    .from("habits")
    .select("id,user_id,name,emoji,category,frequency,goal,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertHabit(userId, habit) {
  if (!userId) {
    // Local-only mode
    const list = readLS(LS_HABITS, []);
    const exists = list.some((h) => h.id === habit.id);
    const next = exists
      ? list.map((h) => (h.id === habit.id ? habit : h))
      : [habit, ...list];
    writeLS(LS_HABITS, next);
    return habit;
  }

  // Cloud: let DB generate id if it's missing/non-uuid
  const isUUID = (v) =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    );

  const payload = { ...habit, user_id: userId };
  if (!isUUID(payload.id)) delete payload.id;

  const { data, error } = await supabase
    .from("habits")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHabit(userId, id) {
  if (!userId) {
    // Local
    writeLS(
      LS_HABITS,
      readLS(LS_HABITS, []).filter((h) => h.id !== id)
    );
    const logs = readLS(LS_LOGS, {});
    delete logs[id];
    writeLS(LS_LOGS, logs);
    return;
  }

  // Cloud
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;

  await supabase
    .from("habit_logs")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", id);
}

// ---------- LOGS ----------
export async function loadLogsForRange(userId, habitIds, fromYmd, toYmd) {
  if (!habitIds?.length) return {};

  if (!userId) {
    const all = readLS(LS_LOGS, {});
    const out = {};
    for (const id of habitIds) out[id] = all[id] || {};
    return out;
  }

  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id,date,completed,value")
    .in("habit_id", habitIds)
    .gte("date", fromYmd)
    .lte("date", toYmd)
    .order("date", { ascending: true });

  if (error) throw error;

  const grouped = {};
  for (const r of data || []) {
    if (!grouped[r.habit_id]) grouped[r.habit_id] = {};
    grouped[r.habit_id][r.date] = {
      completed: !!r.completed,
      value: r.value ?? null,
    };
  }
  for (const id of habitIds) grouped[id] = grouped[id] || {};
  return grouped;
}

export async function toggleLog(userId, habitId, ymd, nextCompleted) {
  if (!userId) {
    const all = readLS(LS_LOGS, {});
    const habit = all[habitId] || {};
    const prev = habit[ymd] || { completed: false, value: null };
    habit[ymd] = { ...prev, completed: !!nextCompleted };
    all[habitId] = habit;
    writeLS(LS_LOGS, all);
    return habit[ymd];
  }

  const payload = {
    user_id: userId,
    habit_id: habitId,
    date: ymd,
    completed: !!nextCompleted,
  };

  const { data, error } = await supabase
    .from("habit_logs")
    .upsert(payload, { onConflict: "user_id,habit_id,date" }) // 👈 important
    .select("habit_id,date,completed,value")
    .single();

  if (error) throw error;
  return data;
}

// ---------- Stats ----------
export function computeStreak(logMap) {
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (; ;) {
    const ymd = formatYMD(d);
    if (logMap?.[ymd]?.completed) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function monthSuccessPercent(logMap) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const first = new Date(y, m, 1);
  first.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let done = 0,
    days = 0;
  for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
    const ymd = formatYMD(d);
    days += 1;
    if (logMap?.[ymd]?.completed) done += 1;
  }
  return days ? Math.round((done * 100) / days) : 0;
}

