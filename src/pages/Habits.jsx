// src/pages/Habits.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import useIsMobile from '../utils/useIsMobile';
import styles from '../styles';

import {
  loadHabits,
  upsertHabit,
  deleteHabit,
  loadLogsForRange,
  toggleLog,
  startOfWeek,
  formatYMD,
  todayYMD,
  computeStreak,
  monthSuccessPercent,
} from '../utils/habits';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const EMOJIS = ['📖', '🏃‍♀️', '🧘‍♂️', '🗣️', '📝', '🧠', '🎧', '🌿', '☀️', '🎨'];

export default function Habits() {
  const isMobile = useIsMobile(768);
  const [session, setSession] = useState(null);

  const gridCols = isMobile
    ? `minmax(160px,1.5fr) repeat(7, 36px) minmax(160px,1fr)`
    : `minmax(160px,1.5fr) repeat(7, minmax(36px, 1fr)) minmax(240px,1fr)`;

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);
  const userId = session?.user?.id || null;

  // habits list
  const [habits, setHabits] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const hs = await loadHabits(userId);
        setHabits(hs);
      } catch (e) {
        console.warn('[Habits] load error', e);
      }
    })();
  }, [userId]);

  // current week
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const days = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // logs for the week
  const [logs, setLogs] = useState({});
  useEffect(() => {
    (async () => {
      if (!habits.length) {
        setLogs({});
        return;
      }
      const from = formatYMD(days[0]);
      const to = formatYMD(days[6]);
      try {
        const grouped = await loadLogsForRange(
          userId,
          habits.map((h) => h.id),
          from,
          to,
        );
        setLogs(grouped);
      } catch (e) {
        console.warn('[Habits] load logs error', e);
      }
    })();
  }, [userId, habits, days]);

  // modal state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    emoji: '📖',
    category: 'Personal',
    frequency: 'daily',
    goal: 1,
  });

  const startAdd = () => {
    setEditingId(null);
    setForm({ name: '', emoji: EMOJIS[0], category: 'Personal', frequency: 'daily', goal: 1 });
    setOpen(true);
  };
  const startEdit = (h) => {
    setEditingId(h.id);
    setForm({
      name: h.name,
      emoji: h.emoji || '📖',
      category: h.category || 'Personal',
      frequency: h.frequency || 'daily',
      goal: h.goal ?? 1,
    });
    setOpen(true);
  };

  const saveHabit = async () => {
    if (!form.name.trim()) return;

    const base = {
      name: form.name.trim(),
      emoji: form.emoji || '📖',
      category: form.category || 'Personal',
      frequency: form.frequency || 'daily',
      goal: Number(form.goal) || 1,
      created_at: new Date().toISOString(),
    };

    // local -> с id; cloud -> без id (пусть БД сгенерит uuid)
    const obj = userId ? base : { id: uid(), ...base };

    try {
      const saved = await upsertHabit(userId, obj);
      setHabits((prev) => {
        const exists = prev.some((h) => h.id === saved.id);
        return exists ? prev.map((h) => (h.id === saved.id ? saved : h)) : [saved, ...prev];
      });
      setOpen(false);
      setEditingId(null);
    } catch (e) {
      console.warn('[Habit] save error', e);
      alert(e.message || 'Failed to save habit.');
    }
  };

  const removeHabit = async (id) => {
    if (!confirm('Delete this habit?')) return;
    try {
      await deleteHabit(userId, id);
      setHabits((p) => p.filter((h) => h.id !== id));
      const copy = { ...logs };
      delete copy[id];
      setLogs(copy);
    } catch (e) {
      console.warn('[Habit] delete error', e);
    }
  };

  const toggle = async (habit, day) => {
    const ymd = formatYMD(day);
    const prev = logs[habit.id]?.[ymd]?.completed || false;
    try {
      const updated = await toggleLog(userId, habit.id, ymd, !prev);
      setLogs((m) => ({
        ...m,
        [habit.id]: { ...(m[habit.id] || {}), [ymd]: updated },
      }));
    } catch (e) {
      console.warn('[Habit] toggle error', e);
    }
  };

  const statFor = (habit) => {
    const map = logs[habit.id] || {};
    const streak = computeStreak(map);
    const monthPct = monthSuccessPercent(map);
    const t = map[todayYMD()]?.completed ? 1 : 0;
    return { streak, monthPct, todayDone: t };
  };

  // gradients via CSS variables (светлая/тёмная тема)
  const gradient = (idx) => {
    const pairs = [
      ['--grad-1-a', '--grad-1-b'],
      ['--grad-2-a', '--grad-2-b'],
      ['--grad-3-a', '--grad-3-b'],
      ['--grad-4-a', '--grad-4-b'],
      ['--grad-5-a', '--grad-5-b'],
    ];
    const [a, b] = pairs[idx % pairs.length];
    return `linear-gradient(135deg, var(${a}), var(${b}))`;
  };

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      {/* header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Habit Tracker</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="wm-btn"
            onClick={() =>
              setWeekStart((w) => {
                const d = new Date(w);
                d.setDate(d.getDate() - 7);
                return d;
              })
            }>
            ← Prev
          </button>
          <button className="wm-btn" onClick={() => setWeekStart(startOfWeek(new Date(), 1))}>
            This week
          </button>
          <button
            className="wm-btn"
            onClick={() =>
              setWeekStart((w) => {
                const d = new Date(w);
                d.setDate(d.getDate() + 7);
                return d;
              })
            }>
            Next →
          </button>
          <button className="wm-btn primary" onClick={startAdd}>
            ＋ New habit
          </button>
        </div>
      </div>

      {/* week header */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap: 8,
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--muted)',
            minWidth: 820,
            paddingBottom: 4,
          }}>
          <div>Habit</div>
          {days.map((d) => (
            <div key={+d} style={{ textAlign: 'center' }}>
              <div>
                {d.toLocaleDateString(undefined, { weekday: isMobile ? 'narrow' : 'short' })}
              </div>
              <div>{d.getDate()}</div>
            </div>
          ))}
          {!isMobile && <div style={{ textAlign: 'right' }}>Stats</div>}
        </div>
      </div>

      {/* rows */}
      <div style={{ display: 'grid', gap: 10 }}>
        {habits.map((h, idx) => {
          const stats = statFor(h);
          return (
            <div style={{ overflowX: 'auto' }} key={h.id}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 8,
                  alignItems: 'stretch',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  background: 'var(--card)',
                  boxShadow: '0 10px 24px var(--shadow)',
                  minWidth: 820,
                }}>
                {/* name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    background: gradient(idx),
                  }}>
                  <div style={{ fontSize: 22 }}>{h.emoji || '📖'}</div>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {h.category} • {h.frequency}
                    </div>
                  </div>
                </div>

                {/* 7 cells */}
                {days.map((d) => {
                  const ymd = formatYMD(d);
                  const done = logs[h.id]?.[ymd]?.completed;
                  const isToday = ymd === todayYMD();

                  const bg = done
                    ? isToday
                      ? 'var(--cell-done-today)'
                      : 'var(--cell-done)'
                    : isToday
                    ? 'var(--cell-today)'
                    : 'var(--cell)';
                  const color = done ? 'var(--cell-text-done)' : 'var(--text)';

                  return (
                    <button
                      key={ymd}
                      onClick={() => toggle(h, d)}
                      title={isToday ? 'Today' : ymd}
                      style={{
                        border: '1px solid var(--border)',
                        background: bg,
                        color,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        borderRadius: 8,
                        margin: 8,
                        height: 42,
                      }}>
                      {done ? '✓' : '—'}
                    </button>
                  );
                })}

                {/* right column: desktop */}
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Streak</div>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{stats.streak} 🔥</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>This month</div>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                      {stats.monthPct}% ✅
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <button className="wm-btn" onClick={() => toggle(h, new Date())}>
                        {stats.todayDone ? '✓ Today done' : 'Mark done'}
                      </button>
                      <button className="wm-btn danger" onClick={() => startEdit(h)}>
                        Edit
                      </button>
                      <button
                        className="wm-btn danger"
                        title="Delete habit"
                        onClick={() => removeHabit(h.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* mobile actions */}
                {isMobile && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: 12,
                      borderTop: '1px solid var(--border)',
                    }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button className="wm-btn" onClick={() => toggle(h, new Date())}>
                        {stats.todayDone ? '✓ Today done' : 'Mark done'}
                      </button>
                      <button className="wm-btn danger" onClick={() => startEdit(h)}>
                        Edit
                      </button>
                      <button
                        className="wm-btn danger"
                        title="Delete habit"
                        onClick={() => removeHabit(h.id)}
                        style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
            No habits yet. Create your first one!
          </div>
        )}
      </div>

      {/* modal */}
      {open && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(15,23,42,.45)',
            zIndex: 80,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}>
          <div
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              borderRadius: 16,
              padding: 16,
              width: 'min(560px, 96vw)',
              boxShadow: '0 20px 50px var(--shadow)',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {editingId ? 'Edit habit' : 'New habit'}
              </div>
              <button className="wm-btn ghost" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>Emoji</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    className="wm-btn"
                    onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                    style={{
                      border: form.emoji === em ? '2px solid #3b82f6' : '1px solid var(--border)',
                    }}>
                    {em}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 12, color: 'var(--muted)' }}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Read 20 pages"
                style={styles.input}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)' }}>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Health / Learning / Work"
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)' }}>Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                    style={styles.input}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Goal (optional number)
                </label>
                <input
                  type="number"
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g., minutes per day"
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="wm-btn ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="wm-btn primary" onClick={saveHabit}>
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
