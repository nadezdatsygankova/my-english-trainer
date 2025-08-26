// src/components/Reader.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles';
import WordPopover from './WordPopover';
import { tokenizeText } from '../utils/tokenize';
import { getLessons, addLesson, deleteLesson, getStatuses, setStatus } from '../utils/statusStore';
import { autoTranslate } from '../utils/translator';
import { bus } from '../utils/bus';

// Helper: find matching word in your deck (for ipa/translation)
function findDeckInfo(deck, key) {
  const low = key.toLowerCase();
  return deck.find((w) => (w.word || '').toLowerCase() === low) || null;
}

// Lightweight IPA helper (gracefully falls back)
async function fetchIPA(word) {
  try {
    const r = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!r.ok) return '';
    const data = await r.json();
    const entry = Array.isArray(data) ? data[0] : null;
    const phon = entry?.phonetic || entry?.phonetics?.find((p) => p.text)?.text || '';
    return phon || '';
  } catch {
    return '';
  }
}
export default function Reader({ words = [], onAddWord, speak }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [lessons, setLessons] = useState(() => getLessons());
  const [statuses, setStatuses] = useState(() => getStatuses());
  // Read current settings (saved by Settings page)
  const targetLang = useMemo(() => localStorage.getItem('targetLang') || 'ru', []);
  const autoTranslateEnabled = useMemo(
    () => localStorage.getItem('autoTranslateEnabled') === '1',
    [],
  );
  // popover state
  const [popWord, setPopWord] = useState(null);
  const [popRect, setPopRect] = useState(null);

  // tokenized output
  const tokens = useMemo(() => tokenizeText(text), [text]);

  // counters
  const counts = useMemo(() => {
    let unknown = 0,
      learning = 0,
      known = 0,
      ignored = 0;
    for (const t of tokens) {
      if (t.type !== 'word') continue;
      const s = statuses[t.key] || 'unknown';
      if (s === 'unknown') unknown++;
      else if (s === 'learning') learning++;
      else if (s === 'known') known++;
      else if (s === 'ignored') ignored++;
    }
    return { unknown, learning, known, ignored };
  }, [tokens, statuses]);

  const onWordClick = (e, t) => {
    if (t.type !== 'word') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopRect(rect);
    setPopWord(t.key);
  };

  const clearPopover = () => {
    setPopWord(null);
    setPopRect(null);
  };

  // add to deck (flashcards)
  const addToDeck = async (rawWord, { doTranslate = false, doIPA = false } = {}) => {
    let translation = '';
    if (doTranslate || (autoTranslateEnabled && !translation)) {
      try {
        translation = await autoTranslate(rawWord, { from: 'en', to: targetLang });
      } catch {}
    }
    let ipa = '';
    if (doIPA) {
      ipa = await fetchIPA(rawWord);
    }
    onAddWord?.({
      word: rawWord,
      translation,
      category: 'noun',
      difficulty: 'easy',
      ipa,
      mnemonic: '',
      imageUrl: '',
      modes: { flashcard: true, spelling: true },
    });
  };

  // coloring similar to LingQ
  const colorFor = (key) => {
    const s = statuses[key] || 'unknown';
    if (s === 'known') return '#dcfce7'; // greenish
    if (s === 'learning') return '#fef9c3'; // yellowish
    if (s === 'ignored') return '#e5e7eb'; // greyer
    return '#f1f5f9'; // unknown
  };
  const textColorFor = (key) => {
    const s = statuses[key] || 'unknown';
    if (s === 'known') return '#14532d';
    if (s === 'learning') return '#7c2d12';
    if (s === 'ignored') return '#475569';
    return '#0f172a';
  };

  const deckInfo = (key) => findDeckInfo(words, key);

  // save/open lessons
  const saveLesson = () => {
    if (!text.trim()) return;
    addLesson(title || 'Untitled', text);
    setLessons(getLessons());
    setTitle('');
    setText('');
  };
  const openLesson = (id) => {
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    setTitle(l.title);
    setText(l.text);
  };
  const removeLesson = (id) => {
    setLessons(deleteLesson(id));
  };

  // keyboard ESC closes popover
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') clearPopover();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <section style={{ ...styles.card, position: 'relative' }}>
      <div style={styles.h2}>Assisted Reader</div>

      {/* Counters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 12px' }}>
        <Badge label="New" value={counts.unknown} color="#0f172a" bg="#e2e8f0" />
        <Badge label="Learning" value={counts.learning} color="#92400e" bg="#fef3c7" />
        <Badge label="Known" value={counts.known} color="#065f46" bg="#d1fae5" />
        <Badge label="Ignored" value={counts.ignored} color="#475569" bg="#e5e7eb" />
      </div>

      {/* Editor / controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <label style={{ display: 'block', color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>
            Title
          </label>
          <input
            style={styles.input}
            placeholder="My article"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 10 }}>
          <label style={{ display: 'block', color: '#0f172a', fontWeight: 700, marginBottom: 16 }}>
            Import .txt
          </label>
          <label style={styles.ghost}>
            Upload
            <input
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const t = await f.text();
                setText(t);
                setTitle(f.name.replace(/\.[^.]+$/, ''));
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={{ display: 'block', color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>
          Text
        </label>
        <textarea
          className="ff-textarea"
          style={{ ...styles.input, height: 140, resize: 'vertical' }}
          placeholder="Paste or type your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={styles.primary} onClick={saveLesson}>
          Save lesson
        </button>
        <button
          style={styles.ghost}
          onClick={() => {
            setText('');
            setTitle('');
          }}>
          Clear
        </button>
        {text && (
          <>
            <button style={styles.ghost} onClick={() => speak(text)}>
              🔊 Read sentence
            </button>
            <button
              style={styles.ghost}
              oonClick={() => {
                // all unique word tokens in the text
                const unique = Array.from(
                  new Set(tokens.filter((t) => t.type === 'word').map((t) => t.key)),
                );

                // previous map (before changes)
                const prev = { ...getStatuses() };

                // set each to learning
                const merged = { ...prev };
                for (const k of unique) merged[k] = 'learning';

                localStorage.setItem('wordStatus-v1', JSON.stringify(merged));
                setStatuses(merged);

                // events only for words that newly became learning
                for (const k of unique) {
                  if ((prev[k] || 'unknown') !== 'learning') {
                    bus.dispatchEvent(new CustomEvent('lingq-created', { detail: { lemma: k } }));
                  }
                }
              }}>
              Mark all as learning
            </button>
          </>
        )}
      </div>

      {/* Lesson library */}
      {lessons.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>My lessons</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
            }}>
            {lessons.map((l) => (
              <div
                key={l.id}
                style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {new Date(l.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button style={styles.ghost} onClick={() => openLesson(l.id)}>
                    Open
                  </button>
                  <button style={styles.danger} onClick={() => removeLesson(l.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reader output */}
      {text && (
        <div
          style={{
            marginTop: 16,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 14,
            lineHeight: 1.9,
          }}>
          {tokens.map((t, i) => {
            if (t.type !== 'word') return <span key={i}>{t.raw}</span>;
            const info = deckInfo(t.key);
            const bg = colorFor(t.key);
            const color = textColorFor(t.key);
            return (
              <span
                key={i}
                onClick={(e) => onWordClick(e, t)}
                style={{
                  background: bg,
                  color,
                  padding: '2px 4px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border:
                    statuses[t.key] === 'ignored' ? '1px dashed #cbd5e1' : '1px solid transparent',
                }}
                title={info?.translation || 'Click to set status / add card'}>
                {t.raw}
              </span>
            );
          })}
        </div>
      )}

      {/* Popover */}
      {popWord && (
        <WordPopoverPortal>
          <WordPopover
            anchorRect={popRect}
            word={popWord}
            ipa={findDeckInfo(words, popWord)?.ipa}
            translation={findDeckInfo(words, popWord)?.translation}
            status={statuses[popWord] || 'unknown'}
            onSetStatus={(newStatus) => {
              const key = popWord;
              const prevStatus = statuses[key] || 'unknown';

              // update store + state
              const next = setStatus(key, newStatus);
              setStatuses(next);

              // event: only when entering "learning"
              if (newStatus === 'learning' && prevStatus !== 'learning') {
                bus.dispatchEvent(new CustomEvent('lingq-created', { detail: { lemma: key } }));
              }
            }}
            onAdd={() => addToDeck(popWord, { doTranslate: false, doIPA: false })}
            onAddTranslate={() => addToDeck(popWord, { doTranslate: true, doIPA: false })}
            onAddIPA={() => addToDeck(popWord, { doTranslate: autoTranslateEnabled, doIPA: true })}
            autoTranslateEnabled={autoTranslateEnabled}
            targetLang={targetLang}
            onClose={clearPopover}
            speak={speak}
          />
        </WordPopoverPortal>
      )}
    </section>
  );
}

function Badge({ label, value, color, bg }) {
  return (
    <span
      style={{
        color,
        background: bg,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
      }}>
      {label}: {value}
    </span>
  );
}

// Minimal portal without extra deps (uses react-dom createPortal)
function WordPopoverPortal({ children }) {
  const elRef = useRef(null);

  if (!elRef.current && typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.zIndex = '999';
    elRef.current = el;
  }

  useEffect(() => {
    if (!elRef.current) return;
    document.body.appendChild(elRef.current);
    return () => {
      try {
        document.body.removeChild(elRef.current);
      } catch {}
    };
  }, []);

  if (!elRef.current) return null;
  return createPortal(children, elRef.current);
}
