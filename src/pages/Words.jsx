// src/pages/Words.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  loadWords as cloudLoadWords,
  upsertWord as cloudUpsertWord,
  deleteWord as cloudDeleteWord,
} from '../utils/cloud';
import { uid, todayISO } from '../utils';

const ui = {
  wrap: { maxWidth: 1100, margin: '0 auto' },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  h1: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 },
  tag: {
    marginLeft: 8,
    fontSize: 12,
    background: '#eef2ff',
    color: '#3730a3',
    padding: '2px 8px',
    borderRadius: 999,
  },
  tools: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: {
    padding: '10px 12px',
    minWidth: 240,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left',
    fontSize: 12,
    letterSpacing: '.02em',
    color: '#475569',
    background: '#f8fafc',
    padding: '10px 8px',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    fontSize: 14,
    color: '#0f172a',
    padding: '8px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
  cellInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    outline: 'none',
  },
  chip: {
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    background: '#f1f5f9',
    color: '#0f172a',
  },
  empty: { padding: 24, textAlign: 'center', color: '#64748b' },
  btn: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    color: '#0f172a', // ← ensure visible text
    fontWeight: 600, // ← bolder label
    lineHeight: 1.2,
  },
  btnRed: {
    padding: '8px 10px',
    border: '1px solid #fecaca',
    background: '#fee2e2',
    color: '#7f1d1d', // ← darker red text
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  btnGreen: {
    padding: '8px 10px',
    border: '1px solid #bbf7d0',
    background: '#dcfce7',
    color: '#064e3b', // ← darker green text
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    lineHeight: 1.2,
  },
};

export default function Words({ words: propWords, setWords: propSetWords, session: propSession }) {
  // Session (if not passed from App, subscribe ourselves)
  const [session, setSession] = useState(propSession ?? null);
  useEffect(() => {
    if (propSession) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, [propSession]);

  // Words state (use props if provided, else manage local)
  const usingProps = !!propWords && !!propSetWords;
  const [localWords, setLocalWords] = useState(() => {
    if (usingProps) return [];
    try {
      return JSON.parse(localStorage.getItem('words-v1') || '[]');
    } catch {
      return [];
    }
  });
  const words = usingProps ? propWords : localWords;
  const setWords = usingProps
    ? propSetWords
    : (fn) =>
        setLocalWords((prev) => {
          const next = typeof fn === 'function' ? fn(prev) : fn;
          localStorage.setItem('words-v1', JSON.stringify(next));
          return next;
        });

  // UI state
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [cloudInfo, setCloudInfo] = useState({ loading: false, error: null, last: '' });

  // Auto-load from cloud on sign-in
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      setCloudInfo({ loading: true, error: null, last: 'loading…' });
      try {
        const data = await cloudLoadWords();
        setWords(data);
        setCloudInfo({ loading: false, error: null, last: `loaded ${data.length} from cloud` });
      } catch (e) {
        setCloudInfo({ loading: false, error: e?.message || String(e), last: 'load failed' });
      }
    })();
  }, [session?.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered view
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return words;
    return words.filter((w) => {
      const hay = [w.word, w.translation, w.category, w.difficulty, w.ipa, w.mnemonic, w.example]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, words]);

  // Handlers
  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({
      word: row.word ?? '',
      translation: row.translation ?? '',
      category: row.category ?? 'noun',
      difficulty: row.difficulty ?? 'medium',
      ipa: row.ipa ?? '',
      mnemonic: row.mnemonic ?? '',
      imageUrl: row.image_url ?? row.imageUrl ?? '',
      example: row.example ?? '',
      modes: row.modes ?? { flashcard: true, spelling: true },
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updatedRow = {
      ...words.find((w) => w.id === editingId),
      ...draft,
      imageUrl: draft.imageUrl, // keep camelCase in app
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => prev.map((w) => (w.id === editingId ? updatedRow : w)));
    setEditingId(null);
    setDraft({});

    // Push to cloud if logged in
    if (session?.user) {
      try {
        await cloudUpsertWord(session.user.id, updatedRow);
        setCloudInfo((s) => ({ ...s, last: 'saved edit' }));
      } catch (e) {
        setCloudInfo({ loading: false, error: e?.message || String(e), last: 'save failed' });
      }
    } else {
      // persist local
      localStorage.setItem('words-v1', JSON.stringify((usingProps ? [] : (prev) => prev)(words)));
    }
  };

  const addQuick = async () => {
    const nw = {
      id: uid(),
      word: 'new word',
      translation: '',
      category: 'noun',
      difficulty: 'easy',
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      nextReview: todayISO(),
      createdAt: todayISO(),
      modes: { flashcard: true, spelling: true },
      ipa: '',
      mnemonic: '',
      imageUrl: '',
      example: '',
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => [nw, ...prev]);
    if (session?.user) {
      try {
        await cloudUpsertWord(session.user.id, nw);
        setCloudInfo((s) => ({ ...s, last: 'added' }));
      } catch (e) {
        setCloudInfo({ loading: false, error: e?.message || String(e), last: 'add failed' });
      }
    }
  };

  const remove = async (id) => {
    const prev = words;
    setWords((w) => w.filter((x) => x.id !== id));
    if (session?.user) {
      try {
        await cloudDeleteWord(id);
        setCloudInfo((s) => ({ ...s, last: 'deleted' }));
      } catch (e) {
        // rollback on failure
        setWords(prev);
        setCloudInfo({ loading: false, error: e?.message || String(e), last: 'delete failed' });
      }
    }
  };

  const refreshCloud = async () => {
    if (!session?.user) {
      setCloudInfo({ loading: false, error: 'Not signed in', last: '' });
      return;
    }
    setCloudInfo({ loading: true, error: null, last: 'refreshing…' });
    try {
      const data = await cloudLoadWords();
      setWords(data);
      setCloudInfo({ loading: false, error: null, last: `loaded ${data.length} from cloud` });
    } catch (e) {
      setCloudInfo({ loading: false, error: e?.message || String(e), last: 'refresh failed' });
    }
  };

  const exportCSV = () => {
    const rows = [
      [
        'id',
        'word',
        'translation',
        'category',
        'difficulty',
        'ipa',
        'mnemonic',
        'example',
        'interval',
        'ease',
        'reps',
        'lapses',
        'nextReview',
        'createdAt',
      ],
    ];
    for (const w of filtered) {
      rows.push([
        w.id,
        w.word ?? '',
        w.translation ?? '',
        w.category ?? '',
        w.difficulty ?? '',
        w.ipa ?? '',
        (w.mnemonic ?? '').replace(/\n/g, ' '),
        (w.example ?? '').replace(/\n/g, ' '),
        w.interval ?? '',
        w.ease ?? '',
        w.reps ?? '',
        w.lapses ?? '',
        w.nextReview ?? w.next_review ?? '',
        w.createdAt ?? w.created_at ?? '',
      ]);
    }
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'words.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={ui.wrap}>
      <div style={ui.head}>
        <h1 style={ui.h1}>
          Your Words <span style={ui.tag}>{words.length}</span>
        </h1>
        <div style={ui.tools}>
          <input
            placeholder="Search word / translation / IPA / note…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={ui.input}
          />
          <button style={ui.btn} onClick={exportCSV}>
            ⬇️ Export CSV
          </button>
          <button style={ui.btn} onClick={addQuick}>
            ＋ Quick add
          </button>
          <button
            style={ui.btn}
            onClick={refreshCloud}
            disabled={cloudInfo.loading}
            title={session?.user ? 'Reload from Supabase' : 'Sign in to use cloud'}>
            {cloudInfo.loading ? 'Refreshing…' : '⟳ Refresh from Cloud'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 8, fontSize: 12, color: '#475569' }}>
        {session?.user ? 'Cloud: connected' : 'Cloud: not signed in'}
        {cloudInfo.last ? ` • ${cloudInfo.last}` : ''}
        {cloudInfo.error ? (
          <span style={{ color: '#b91c1c' }}> • error: {cloudInfo.error}</span>
        ) : null}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <table style={ui.table}>
          <thead>
            <tr>
              <th style={ui.th}>Word</th>
              <th style={ui.th}>Translation</th>
              <th style={ui.th}>IPA</th>
              <th style={ui.th}>Category</th>
              <th style={ui.th}>Diff</th>
              <th style={ui.th}>Example / Note</th>
              <th style={ui.th}>SRS</th>
              <th style={ui.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={ui.empty}>
                  No words yet.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id}>
                    <td style={ui.td}>
                      {isEditing ? (
                        <input
                          style={ui.cellInput}
                          value={draft.word}
                          onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))}
                        />
                      ) : (
                        <strong>{row.word}</strong>
                      )}
                    </td>
                    <td style={ui.td}>
                      {isEditing ? (
                        <input
                          style={ui.cellInput}
                          value={draft.translation}
                          onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
                        />
                      ) : (
                        row.translation
                      )}
                    </td>
                    <td style={ui.td}>
                      {isEditing ? (
                        <input
                          style={ui.cellInput}
                          value={draft.ipa}
                          onChange={(e) => setDraft((d) => ({ ...d, ipa: e.target.value }))}
                        />
                      ) : (
                        <span style={{ fontFamily: 'serif' }}>{row.ipa ?? ''}</span>
                      )}
                    </td>
                    <td style={ui.td}>
                      {isEditing ? (
                        <input
                          style={ui.cellInput}
                          value={draft.category}
                          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                        />
                      ) : (
                        <span style={ui.chip}>{row.category}</span>
                      )}
                    </td>
                    <td style={ui.td}>
                      {isEditing ? (
                        <input
                          style={ui.cellInput}
                          value={draft.difficulty}
                          onChange={(e) => setDraft((d) => ({ ...d, difficulty: e.target.value }))}
                        />
                      ) : (
                        <span style={ui.chip}>{row.difficulty}</span>
                      )}
                    </td>
                    <td style={ui.td} title={row.mnemonic || ''}>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          style={{ ...ui.cellInput, resize: 'vertical' }}
                          value={draft.example}
                          onChange={(e) => setDraft((d) => ({ ...d, example: e.target.value }))}
                          placeholder="Example sentence or note"
                        />
                      ) : (
                        row.example || row.mnemonic || ''
                      )}
                    </td>
                    <td style={ui.td}>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        int {row.interval ?? 0} • ease {row.ease ?? 2.5}
                        <div>next {row.nextReview ?? row.next_review ?? '—'}</div>
                      </div>
                    </td>
                    <td style={ui.td}>
                      {!isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={ui.btnGreen} onClick={() => startEdit(row)}>
                            Edit
                          </button>
                          <button style={ui.btnRed} onClick={() => remove(row.id)}>
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={ui.btnGreen} onClick={saveEdit}>
                            Save
                          </button>
                          <button style={ui.btn} onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
