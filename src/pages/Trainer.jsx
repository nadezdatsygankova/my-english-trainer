// src/pages/Trainer.jsx
import React, { useMemo, useState, useEffect } from 'react';
import Filters from '../components/Filters';
import Flashcard from '../components/Flashcard';
import EarTraining from '../components/EarTraining';
import SpellingGame from '../components/SpellingGame';
import { todayISO, clamp } from '../utils';
import { scheduleCard, scheduleCard4 } from '../utils/scheduler';
import { appendReview } from '../utils/reviews';
import useIsMobile from '../utils/useIsMobile';

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

export default function Trainer() {
  const isMobile = useIsMobile(768);

  // Words + progress
  const [words, setWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('words-v1') || '[]');
    } catch {
      return [];
    }
  });
  const [progress, setProgress] = useState(() => +localStorage.getItem('progress') || 0);

  // Flashcards filters
  const [filterCat, setFilterCat] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [showAnswer, setShowAnswer] = useState(false);
  const [idx, setIdx] = useState(0);
  const [pictureOnly, setPictureOnly] = useState(() => localStorage.getItem('pictureOnly') === '1');
  useEffect(() => {
    localStorage.setItem('pictureOnly', pictureOnly ? '1' : '0');
  }, [pictureOnly]);

  const dueList = useMemo(
    () => words.filter((w) => w.modes?.flashcard && (!w.nextReview || w.nextReview <= todayISO())),
    [words],
  );
  const filteredDue = useMemo(
    () =>
      dueList.filter(
        (w) =>
          (filterCat === 'all' || w.category === filterCat) &&
          (filterDiff === 'all' || w.difficulty === filterDiff),
      ),
    [dueList, filterCat, filterDiff],
  );
  const current = filteredDue[idx] ?? null;

  // Grade flashcards
  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch {}
  };

  const grade = (correct) => {
    if (!current) return;
    const nextObj = {
      ...current,
      ...scheduleCard(current, !!correct),
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => prev.map((w) => (w.id === current.id ? nextObj : w)));
    if (correct) setProgress((p) => clamp(p + 5, 0, 100));
    setShowAnswer(false);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));
    appendReview({
      id: current.id,
      word: current.word,
      correct: !!correct,
      mode: 'flashcard',
    });
  };

  // Minimal pairs
  const [minimalPairs, setMinimalPairs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('minimalPairs') || 'null') || DEFAULT_MINIMAL_PAIRS;
    } catch {
      return DEFAULT_MINIMAL_PAIRS;
    }
  });
  const [targetSounds, setTargetSounds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('targetSounds') || '[]');
    } catch {
      return [];
    }
  });

  const selectedFocuses = useMemo(() => {
    if (targetSounds?.length) return targetSounds;
    return Array.from(new Set(minimalPairs.map((p) => p.focus || 'custom')));
  }, [targetSounds, minimalPairs]);

  const filteredPairs = useMemo(
    () => minimalPairs.filter((p) => selectedFocuses.includes(p.focus || 'custom')),
    [minimalPairs, selectedFocuses],
  );

  const handleUseDefaults = () => {
    const uniq = Array.from(new Set(minimalPairs.map((p) => p.focus || 'custom')));
    setTargetSounds(uniq);
    localStorage.setItem('targetSounds', JSON.stringify(uniq));
  };

  const [mpIndex, setMpIndex] = useState(0);
  const [mpPlayed, setMpPlayed] = useState(null);
  const [mpMsg, setMpMsg] = useState(null);

  const currentPair = filteredPairs.length ? filteredPairs[mpIndex % filteredPairs.length] : null;

  const playPair = () => {
    if (!currentPair) return;
    const which = Math.random() < 0.5 ? 'a' : 'b';
    setMpPlayed(which);
    setMpMsg(null);
    speak(which === 'a' ? currentPair.a : currentPair.b);
  };
  const guessPair = (choice) => {
    if (!mpPlayed) {
      setMpMsg({ type: 'bad', text: 'Press Play first.' });
      return;
    }
    const correct = choice === mpPlayed;
    setMpMsg({ type: correct ? 'good' : 'bad', text: correct ? 'Correct!' : 'Not this one.' });
    if (correct) setMpIndex((i) => i + 1);
  };

  // Spelling game pool
  const spellingList = useMemo(
    () =>
      words.filter(
        (w) =>
          w.modes?.spelling &&
          (filterCat === 'all' || w.category === filterCat) &&
          (filterDiff === 'all' || w.difficulty === filterDiff),
      ),
    [words, filterCat, filterDiff],
  );
  const gradeWith = (choice /* "again"|"hard"|"good"|"easy" */) => {
    if (!current) return;
    const nextObj = {
      ...current,
      ...scheduleCard4(current, choice),
      updated_at: new Date().toISOString(),
    };

    setWords((prev) => prev.map((w) => (w.id === current.id ? nextObj : w)));
    if (choice === 'good' || choice === 'easy') {
      setProgress((p) => clamp(p + 5, 0, 100));
    }

    setShowAnswer(false);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));

    appendReview({
      id: current.id,
      word: current.word,
      correct: choice === 'good' || choice === 'easy',
      mode: 'flashcard',
    });
  };

  const sectionStyle = {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
  };

  return (
    <section style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      {/* Progress */}
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 18 : 20 }}>Progress</h2>
        <div style={{ background: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, background: '#3b82f6', height: 8 }} />
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
          {progress}% complete • {filteredDue.length} due (filtered) / {words.length} total
        </div>
      </div>

      {/* Filters (collapse visually on mobile) */}
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 18 : 20 }}>Filters</h2>
        <Filters
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          filterDiff={filterDiff}
          setFilterDiff={setFilterDiff}
        />
      </div>

      {/* Flashcards */}
      <label
        style={{
          display: 'inline-flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 12,
          color: '#475569',
        }}>
        <input
          type="checkbox"
          checked={pictureOnly}
          onChange={(e) => setPictureOnly(e.target.checked)}
        />
        Picture-only cards
      </label>
      <div style={sectionStyle}>
        <Flashcard
          current={current}
          pictureOnly={pictureOnly}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          speak={speak}
          grade={grade}
          gradeWith={gradeWith}
        />
      </div>

      {/* Ear Training */}
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 18 : 20 }}>Ear Training (Minimal Pairs)</h2>
        {filteredPairs.length === 0 ? (
          <div style={{ color: '#6b7280' }}>
            <p style={{ marginTop: 0 }}>Add target sounds in Settings or import pairs to begin.</p>
            <button
              onClick={handleUseDefaults}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 700,
              }}>
              Use all available focuses
            </button>
          </div>
        ) : (
          <EarTraining
            currentPair={currentPair}
            speak={speak}
            playPair={playPair}
            guessPair={guessPair}
            mpMsg={mpMsg}
          />
        )}
      </div>

      {/* Spelling Game */}
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 18 : 20 }}>Spelling Practice</h2>
        <SpellingGame
          words={spellingList}
          onCorrect={(w) =>
            appendReview({
              id: w.id,
              word: w.word,
              correct: true,
              date: todayISO(),
              mode: 'spelling',
            })
          }
          onIncorrect={(w) =>
            appendReview({
              id: w.id,
              word: w.word,
              correct: false,
              date: todayISO(),
              mode: 'spelling',
            })
          }
          // nice mobile typing experience:
          inputProps={{ inputMode: 'latin', autoCapitalize: 'off', autoCorrect: 'off' }}
        />
      </div>

      {/* Sticky mobile action bar */}
      {isMobile && current && (
        <div className="mob-bar">
          {!showAnswer ? (
            <div className="mob-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button className="mob-btn" onClick={() => speak(current.word)}>
                🔊 Speak
              </button>
              <button className="mob-btn primary" onClick={() => setShowAnswer(true)}>
                Show answer
              </button>
            </div>
          ) : (
            <div className="mob-row">
              <button className="mob-btn bad" onClick={() => grade(false)}>
                Again
              </button>
              <button className="mob-btn good" onClick={() => grade(true)}>
                Good
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
