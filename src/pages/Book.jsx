import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { uid } from '../utils';
import { loadBooks, loadNotes, addNote, loadSessions, addSession } from '../utils/books';
import { autoTranslate } from '../utils/translator';

// quick “add to deck” (local-first; if you already have a centralized helper, swap it in)
function addToDeckLocal(word, translation = '') {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('words-v1') || '[]');
  } catch {}
  const exists = list.some((w) => (w.word || '').toLowerCase() === word.toLowerCase());
  if (exists) return;
  const today = new Date().toISOString().slice(0, 10);
  list = [
    {
      id: uid(),
      word,
      translation,
      category: 'noun',
      difficulty: 'easy',
      ipa: '',
      mnemonic: '',
      imageUrl: '',
      modes: { flashcard: true, spelling: true },
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      nextReview: today,
      createdAt: today,
      updated_at: new Date().toISOString(),
    },
    ...list,
  ];
  localStorage.setItem('words-v1', JSON.stringify(list));
  // optional: dispatch your existing bus event so other pages refresh
  try {
    const { bus } = require('../utils/bus');
    bus.dispatchEvent(new CustomEvent('words-changed', { detail: { size: list.length } }));
  } catch {}
}

export default function Book() {
  const { id } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const userId = session?.user?.id || null;

  const [book, setBook] = useState(null);
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [newNote, setNewNote] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [extract, setExtract] = useState('');

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // load book + notes + sessions
  useEffect(() => {
    (async () => {
      const all = await loadBooks(userId);
      setBook(all.find((b) => b.id === id) || null);
      setNotes(await loadNotes(userId, id));
      setSessions(await loadSessions(userId, id));
    })();
  }, [userId, id]);

  const readingMinutes7d = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
    return sessions
      .filter((s) => new Date(s.date) >= cutoff)
      .reduce((sum, s) => sum + (s.minutes || 0), 0);
  }, [sessions]);

  const addNoteNow = async () => {
    if (!newNote.trim()) return;
    await addNote(userId, id, newNote.trim());
    setNotes(await loadNotes(userId, id));
    setNewNote('');
  };

  const addSessionNow = async () => {
    await addSession(userId, id, { minutes: Number(minutes) || 0, pages: 0 });
    setSessions(await loadSessions(userId, id));
  };

  const extractToWords = async () => {
    if (!extract.trim()) return;
    // very simple tokenizer: split on non-letters
    const tokens = extract.split(/[^A-Za-z'-]+/).filter(Boolean);
    const uniq = Array.from(new Set(tokens.map((t) => t.toLowerCase()))).slice(0, 50);
    // you can auto-translate if your setting is enabled
    for (const w of uniq) {
      addToDeckLocal(w, ''); // keep fast; user can translate later
    }
    setExtract('');
    alert(`Added ${uniq.length} words to your deck.`);
  };

  if (!book) {
    return (
      <section>
        <button onClick={() => nav('/books')} style={{ marginBottom: 8 }}>
          ← Back
        </button>
        <div>Book not found.</div>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button onClick={() => nav('/books')} style={{ padding: '6px 10px' }}>
          ← Library
        </button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{book.title}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {book.author || '—'} · {book.language || 'en'}
          </div>
        </div>
      </div>

      {/* Edit full book info */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Edit book info</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            type="text"
            value={book.title}
            onChange={(e) => setBook({ ...book, title: e.target.value })}
            placeholder="Title"
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          />
          <input
            type="text"
            value={book.author || ''}
            onChange={(e) => setBook({ ...book, author: e.target.value })}
            placeholder="Author"
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          />
          <input
            type="text"
            value={book.language || ''}
            onChange={(e) => setBook({ ...book, language: e.target.value })}
            placeholder="Language"
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          />
          <input
            type="url"
            value={book.cover_url || ''}
            onChange={(e) => setBook({ ...book, cover_url: e.target.value })}
            placeholder="Cover image URL"
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          />
          <input
            type="number"
            value={book.progress_pages || 0}
            onChange={(e) => setBook({ ...book, progress_pages: Number(e.target.value) })}
            placeholder="Pages read"
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          />
          <select
            value={book.status || 'reading'}
            onChange={(e) => setBook({ ...book, status: e.target.value })}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%' }}
          >
            <option value="reading">Reading</option>
            <option value="finished">Finished</option>
          </select>
          <div style={{ textAlign: 'right' }}>
            <button
              style={btnPrimary}
              onClick={async () => {
                const updated = {
                  title: book.title,
                  author: book.author,
                  language: book.language,
                  cover_url: book.cover_url,
                  progress_pages: book.progress_pages,
                  status: book.status,
                };
                await supabase.from('books').update(updated).eq('id', book.id);
                alert('Book updated!');
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 12,
        }}>
        <KPI label="Reading (7d)" value={`${readingMinutes7d} min`} />
        <KPI label="Notes" value={notes.length} />
        <KPI label="Sessions" value={sessions.length} />
      </div>

      {/* Book status */}
      {/*
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Status</div>
        {book.status === 'finished' ? (
          <div style={{ color: '#065f46' }}>✅ Finished</div>
        ) : (
          <button
            onClick={async () => {
              const updated = { ...book, status: 'finished' };
              await supabase.from('books').update({ status: 'finished' }).eq('id', book.id);
              setBook(updated);
            }}
            style={btnPrimary}>
            Mark as finished
          </button>
        )}
      </div>
      */}

      {/* Add note */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Add a note</div>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Your thoughts about this book…"
          style={{
            width: '100%',
            minHeight: 90,
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: 10,
          }}
        />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button onClick={addNoteNow} style={btnPrimary}>
            Save note
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
        {notes.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No notes yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {notes.map((n) => (
              <div
                key={n.id}
                style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {/* super simple extract → words */}
                  <button
                    style={btnGhost}
                    onClick={() => addToDeckLocal(n.text.split(/\s+/)[0] || '')}>
                    Add first word to deck
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reading session quick-log */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Quick reading log</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '8px 10px',
              width: 100,
            }}
            placeholder="Minutes"
          />
          <button style={btnPrimary} onClick={addSessionNow}>
            Add session
          </button>
        </div>
        {sessions.length > 0 && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            Last: {sessions[0].date} · {sessions[0].minutes} min
          </div>
        )}
      </div>

      {/* Highlight importer → vocab */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Highlights → Vocabulary</div>
        <textarea
          value={extract}
          onChange={(e) => setExtract(e.target.value)}
          placeholder="Paste a highlight or paragraph; we'll extract unique words and add them to your deck."
          style={{
            width: '100%',
            minHeight: 90,
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: 10,
          }}
        />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button style={btnGhost} onClick={extractToWords}>
            Extract & add to deck
          </button>
        </div>
      </div>
    </section>
  );
}

function KPI({ label, value }) {
  return (
    <div style={{ border: '1px solid #eef2f7', borderRadius: 12, background: '#fff', padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

const card = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' };
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
