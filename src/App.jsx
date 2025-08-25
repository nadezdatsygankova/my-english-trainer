// src/App.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { NavLink, Outlet, Route, Routes } from 'react-router-dom';
// supabase + auth
import { supabase } from './utils/supabaseClient';
import AuthBar from './components/AuthBar';

// utils
import { todayISO, clamp, uid, safeLower, levenshtein } from './utils';
import { scheduleCard } from './utils/scheduler';
import { autoTranslate } from './utils/translator';
import { loadWords, upsertWord, deleteWord as cloudDeleteWord, insertReview } from './utils/cloud';
import { bus } from './utils/bus';
// pages
import Home from './pages/Home.jsx';
import Trainer from './pages/Trainer.jsx';
// import Podcasts from './pages/Podcasts.jsx';
import ReaderPage from './pages/ReaderPage.jsx';
import Words from './pages/Words.jsx';
import Stats from './pages/Stats.jsx';
import Settings from './pages/Settings.jsx';

const DEFAULT_MINIMAL_PAIRS = [
  { a: 'ship', b: 'sheep', ipa: '/ʃɪp/ vs /ʃiːp/', focus: 'ɪ vs iː' },
  { a: 'bit', b: 'beat', ipa: '/bɪt/ vs /biːt/', focus: 'ɪ vs iː' },
  { a: 'full', b: 'fool', ipa: '/fʊl/ vs /fuːl/', focus: 'ʊ vs uː' },
  { a: 'bat', b: 'bet', ipa: '/bæt/ vs /bɛt/', focus: 'æ vs e' },
  { a: 'rice', b: 'lice', ipa: '/raɪs/ vs /laɪs/', focus: 'r vs l' },
  { a: 'thin', b: 'then', ipa: '/θɪn/ vs /ðɛn/', focus: 'θ vs ð' },
  { a: 'throw', b: 'though', ipa: '/θroʊ/ vs /ðoʊ/', focus: 'θ vs ð' },
  { a: 'coat', b: 'goat', ipa: '/koʊt/ vs /goʊt/', focus: 'k vs g' },
  { a: 'fan', b: 'van', ipa: '/fæn/ vs /væn/', focus: 'f vs v' },
];

// layout wrapper
function Layout({ session }) {
  return (
    <div className="site">
      <header className="site-header" style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
          <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/trainer">Trainer</NavLink>
            <NavLink to="/words">Words</NavLink>
            <NavLink to="/reader">Reader</NavLink>
            {/* <NavLink to="/podcasts">Podcasts</NavLink> */}
            <NavLink to="/stats">Statistics</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
          <AuthBar session={session} />
        </div>
      </header>

      <main className="site-main" style={{ padding: 16 }}>
        <Outlet />
      </main>

      <footer className="site-footer" style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
        <small>© {new Date().getFullYear()} My English Trainer</small>
      </footer>
    </div>
  );
}

export default function App() {
  // ---- Supabase session (for AuthBar + cloud sync) ----
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const useCloud = !!session?.user;

  // ---- Global State (words, minimalPairs, progress, settings) ----
  const [words, setWords] = useState(() => {
    const s = localStorage.getItem('words-v1');
    return s ? JSON.parse(s) : [];
  });
  useEffect(() => localStorage.setItem('words-v1', JSON.stringify(words)), [words]);

  const [minimalPairs, setMinimalPairs] = useState([]);
  const [reviewLog, setReviewLog] = useState([]);
  const [progress, setProgress] = useState(0);
  const [targetSounds, setTargetSounds] = useState(['ɪ vs iː', 'θ vs ð']);
  const [enableSR, setEnableSR] = useState(false);
  const [pictureOnly, setPictureOnly] = useState(false);
  const [targetLang, setTargetLang] = useState('ru');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);

  // ---- utils ----
  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch {}
  };

  const grade = (
    current,
    correct,
    filteredDue,
    setIdx,
    setShowAnswer,
    setSpellInput,
    setSpellMsg,
    setHintTokens,
  ) => {
    if (!current) return;
    const nextObj = {
      ...current,
      ...scheduleCard(current, !!correct),
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => prev.map((w) => (w.id === current.id ? nextObj : w)));

    setReviewLog((log) => {
      const next = [
        ...log,
        {
          id: current.id,
          word: current.word,
          correct: !!correct,
          date: todayISO(),
          mode: 'flashcard',
        },
      ];
      // notify listeners
      queueMicrotask(() => {
        bus.dispatchEvent(
          new CustomEvent('review-log-changed', {
            detail: { entry: next[next.length - 1], size: next.length },
          }),
        );
      });
      return next;
    });

    if (correct) setProgress((p) => clamp(p + 5, 0, 100));
    setShowAnswer(false);
    setSpellInput('');
    setSpellMsg(null);
    setHintTokens([]);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));

    if (useCloud) {
      upsertWord(session.user.id, nextObj).catch(() => {});
      insertReview(session.user.id, {
        word_id: nextObj.id,
        correct: !!correct,
        mode: 'flashcard',
      }).catch(() => {});
    }
  };

  // ---- Router ----
  return (
    <Routes>
      <Route element={<Layout session={session} />}>
        <Route index element={<Home />} />
        <Route
          path="trainer"
          element={
            <Trainer
              words={words}
              setWords={setWords}
              minimalPairs={minimalPairs}
              setMinimalPairs={setMinimalPairs}
              targetSounds={targetSounds}
              pictureOnly={pictureOnly}
              enableSR={enableSR}
              speak={speak}
              grade={grade}
              reviewLog={reviewLog}
              setReviewLog={setReviewLog}
              progress={progress}
              setProgress={setProgress}
              session={session}
            />
          }
        />
        {/* <Route
          path="podcasts"
          element={
            <Podcasts
              words={words}
              setWords={setWords}
              speak={speak}
              session={session}
              targetLang={targetLang}
            />
          }
        /> */}
        <Route
          path="reader"
          element={
            <ReaderPage
              words={words}
              setWords={setWords}
              speak={speak}
              session={session}
              targetLang={targetLang}
              autoTranslateEnabled={autoTranslateEnabled}
            />
          }
        />
        <Route
          path="words"
          element={<Words words={words} setWords={setWords} session={session} />}
        />
        <Route
          path="stats"
          element={
            <Stats
              // If you keep words & reviewLog in App state, pass them so Stats stays in sync
              words={words}
              reviewLog={reviewLog}
            />
          }
        />
        <Route path="settings" element={<Settings />} /> {/* ← new */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
