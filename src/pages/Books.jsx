// src/pages/Books.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import {
  loadBooks,
  upsertBook,
  deleteBook,
  loadNotes,
  addNote,
  deleteNote,
  loadSessions,
  addSession,
  deleteSession,
} from '../utils/books';

export default function Books() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  // form keeps friendly names; we’ll map to snake_case on save
  const [form, setForm] = useState({
    title: '',
    author: '',
    coverUrl: '',
    language: 'en',
    totalPages: '',
  });

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);
  const userId = session?.user?.id || null;

  // load
  useEffect(() => {
    (async () => {
      try {
        const loadedBooks = await loadBooks(userId);
        loadedBooks.sort((a, b) => new Date(b.added_at) - new Date(a.added_at)); // newest first
        setBooks(loadedBooks);
      } catch {
        setBooks([]);
      }
    })();
  }, [userId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const sorted = books.slice().sort((a, b) => new Date(b.added_at) - new Date(a.added_at)); // newest first
    if (!qq) return sorted;
    return sorted.filter(
      (b) =>
        (b.title || '').toLowerCase().includes(qq) || (b.author || '').toLowerCase().includes(qq),
    );
  }, [q, books]);

  const startAdd = () => {
    setForm({ title: '', author: '', coverUrl: '', language: 'en', totalPages: '' });
    setOpen(true);
  };

  const saveBook = async () => {
    const toIntOrNull = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const payload = {
      title: (form.title || '').trim(),
      author: (form.author || '').trim(),
      cover_url: (form.coverUrl || '').trim() || null,
      // you don’t currently store language in DB; keep it client-side or add a column
      pages_total: toIntOrNull(form.totalPages),
      // DB default for progress_pages is 0; omit unless you want to set explicitly
      // added_at is defaulted by DB; omit
    };

    if (!payload.title) return;

    try {
      await upsertBook(userId, payload);
      const loadedBooks = await loadBooks(userId);
      loadedBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest first
      setBooks(loadedBooks);
      setOpen(false);
    } catch (e) {
      console.error('[Books] save error:', e);
      alert(
        e?.message ||
          e?.error?.message ||
          (typeof e === 'object' ? JSON.stringify(e, null, 2) : String(e)),
      );
    }
  };

  const remove = async (id) => {
    try {
      await deleteBook(userId, id);
      const loadedBooks = await loadBooks(userId);
      loadedBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest first
      setBooks(loadedBooks);
    } catch (e) {
      console.error('[Books] delete error:', e);
      alert(e?.message || 'Failed to delete.');
    }
  };

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>My Books</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search title or author…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
          />
          <button onClick={startAdd} style={btnPrimary}>
            + Add book
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}>
        {filtered.map((b) => (
          <article key={b.id} style={card}>
            <div style={{ cursor: 'pointer' }} onClick={() => nav(`/books/${b.id}`)}>
              <div
                style={{
                  background: '#f1f5f9',
                  height: 200,
                  borderRadius: 10,
                  marginBottom: 8,
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                }}>
                {b.cover_url ? (
                  <img
                    alt={b.title}
                    src={b.cover_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>No cover</div>
                )}
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{b.author || '—'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Added: {new Date(b.added_at).toLocaleDateString()}
              </div>
              {b.finished && (
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Finished</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={btnGhost} onClick={() => nav(`/books/${b.id}`)}>
                Open
              </button>
              <button style={btnDanger} onClick={() => remove(b.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <div style={{ color: '#6b7280' }}>No books yet.</div>}
      </div>

      {open && (
        <div style={modalScrim} onClick={() => setOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add book</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={input}
              />
              <input
                placeholder="Author"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                style={input}
              />
              <input
                placeholder="Cover URL (optional)"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                style={input}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  placeholder="Language (en)"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  style={input}
                />
                <input
                  placeholder="Total pages (optional)"
                  type="number"
                  value={form.totalPages}
                  onChange={(e) => setForm({ ...form, totalPages: e.target.value })}
                  style={input}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button style={btnGhost} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button style={btnPrimary} onClick={saveBook}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const card = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#fff' };
const input = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' };
const btnPrimary = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #3b82f6',
  background: '#3b82f6',
  color: '#fff',
};
const btnGhost = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
};
const btnDanger = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #ef4444',
  background: '#fff',
  color: '#b91c1c',
};
const modalScrim = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.2)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 80,
};
const modal = {
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  width: 420,
  maxWidth: '95vw',
  boxShadow: '0 10px 30px rgba(0,0,0,.08)',
};
