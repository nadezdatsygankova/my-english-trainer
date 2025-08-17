import React, { useEffect, useMemo, useRef, useState } from 'react';
import './animations.css';
import styles from './styles';

// utils
import { todayISO, clamp, uid, safeLower, levenshtein } from './utils';
import { scheduleCard } from './utils/scheduler';

// Supabase client & cloud helpers
import { supabase } from './supabaseClient';
import AuthBar from './components/AuthBar';
import {
  loadWords,
  upsertWord,
  deleteWord as cloudDeleteWord,
  insertReview,
  pingSupabase,
  testInsertWord,
} from './utils/cloud';

// components
import HeaderBar from './components/HeaderBar';
import Filters from './components/Filters';
import Flashcard from './components/Flashcard';
import SpellingGame from './components/SpellingGame';
import EarTraining from './components/EarTraining';
import SpeakPractice from './components/SpeakPractice';
import WordManagerModal from './components/WordManagerModal';
import SettingsModal from './components/SettingsModal';
import Statistics from './components/Statistics.jsx';
import Reader from './components/Reader';
import DebugPanel from './components/DebugPanel';

// ---------- starter data ----------
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

const B2_PACK = [
  {
    word: 'abolish',
    definition: 'Formally put an end to a system or practice',
    partOfSpeech: 'verb',
    example: 'The government decided to abolish the outdated law.',
  },
  {
    word: 'abundant',
    definition: 'Existing in large quantities; plentiful',
    partOfSpeech: 'adjective',
    example: 'The garden was abundant with colorful flowers.',
  },
  {
    word: 'adverse',
    definition: 'Harmful or unfavorable',
    partOfSpeech: 'adjective',
    example: 'The policy had an adverse effect on the economy.',
  },
  {
    word: 'advocate',
    definition: 'A person who supports or speaks in favor of something',
    partOfSpeech: 'noun',
    example: 'She is a strong advocate for environmental protection.',
  },
  {
    word: 'amend',
    definition: 'Make changes to a text or law',
    partOfSpeech: 'verb',
    example: 'The constitution was amended to allow more voting rights.',
  },
  {
    word: 'comprehensive',
    definition: 'Complete and including everything necessary',
    partOfSpeech: 'adjective',
    example: 'They conducted a comprehensive review of the policy.',
  },
];

export default function App() {
  // ---------- session (Supabase) ----------
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------- global state ----------
  const [progress, setProgress] = useState(() => +localStorage.getItem('progress') || 0);

  const [words, setWords] = useState(() => {
    const s = localStorage.getItem('words-v1');
    if (s) return JSON.parse(s);
    return [
      {
        id: uid(),
        word: 'cold',
        translation: 'холодный',
        category: 'adjective',
        difficulty: 'easy',
        interval: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        nextReview: todayISO(),
        createdAt: todayISO(),
        ipa: '/koʊld/',
        mnemonic: 'Ice cube',
        imageUrl: '',
        modes: { flashcard: true, spelling: true },
      },
      {
        id: uid(),
        word: 'liberty',
        translation: 'свобода',
        category: 'noun',
        difficulty: 'medium',
        interval: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        nextReview: todayISO(),
        createdAt: todayISO(),
        ipa: '/ˈlɪbərti/',
        mnemonic: 'Statue of Liberty',
        imageUrl: '',
        modes: { flashcard: true, spelling: true },
      },
    ];
  });

  const [minimalPairs, setMinimalPairs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('minimalPairs') || 'null') || DEFAULT_MINIMAL_PAIRS;
    } catch {
      return DEFAULT_MINIMAL_PAIRS;
    }
  });

  // word editor / modals
  const [showManager, setShowManager] = useState(false);
  const [form, setForm] = useState({
    word: '',
    translation: '',
    category: 'noun',
    difficulty: 'easy',
    ipa: '',
    mnemonic: '',
    imageUrl: '',
    modes: { flashcard: true, spelling: true },
  });
  const [editingId, setEditingId] = useState(null);

  // filtering + current card
  const [showAnswer, setShowAnswer] = useState(false);
  const [idx, setIdx] = useState(0);
  const [filterCat, setFilterCat] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');

  // spelling feedback
  const [spellInput, setSpellInput] = useState('');
  const [spellMsg, setSpellMsg] = useState(null);
  const [hintTokens, setHintTokens] = useState([]);

  // stats
  const [reviewLog, setReviewLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('reviewLog-v1') || '[]');
    } catch {
      return [];
    }
  });

  // settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetSounds, setTargetSounds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('targetSounds') || '["ɪ vs iː","θ vs ð"]');
    } catch {
      return ['ɪ vs iː', 'θ vs ð'];
    }
  });
  const [enableSR, setEnableSR] = useState(() => localStorage.getItem('enableSR') === '1');
  const [pictureOnly, setPictureOnly] = useState(() => localStorage.getItem('pictureOnly') === '1');

  // ear-training state
  const [mpIndex, setMpIndex] = useState(0);
  const [mpPlayed, setMpPlayed] = useState(null);
  const [mpMsg, setMpMsg] = useState(null);

  // debug panel state
  const [lastOp, setLastOp] = useState('');
  const [lastErr, setLastErr] = useState(null);

  const useCloud = !!session?.user;

  // ---------- derived lists ----------
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

  const filteredPairs = useMemo(
    () => minimalPairs.filter((p) => targetSounds.includes(p.focus)),
    [minimalPairs, targetSounds],
  );
  const currentPair = filteredPairs.length ? filteredPairs[mpIndex % filteredPairs.length] : null;

  // ---------- persistence (local cache always updated) ----------
  useEffect(() => localStorage.setItem('words-v1', JSON.stringify(words)), [words]);
  useEffect(
    () => localStorage.setItem('minimalPairs', JSON.stringify(minimalPairs)),
    [minimalPairs],
  );
  useEffect(() => localStorage.setItem('progress', String(progress)), [progress]);
  useEffect(() => setIdx(0), [filterCat, filterDiff]);
  useEffect(
    () => localStorage.setItem('targetSounds', JSON.stringify(targetSounds)),
    [targetSounds],
  );
  useEffect(() => localStorage.setItem('enableSR', enableSR ? '1' : '0'), [enableSR]);
  useEffect(() => localStorage.setItem('pictureOnly', pictureOnly ? '1' : '0'), [pictureOnly]);
  useEffect(() => localStorage.setItem('reviewLog-v1', JSON.stringify(reviewLog)), [reviewLog]);

  // ---------- CLOUD: initial load + realtime subscription ----------
  useEffect(() => {
    if (!useCloud) return; // stay on local-only mode
    let channel;
    (async () => {
      try {
        const remote = await loadWords();
        setWords(remote); // cloud is source of truth
        setLastOp(`load cloud (${remote.length})`);
        setLastErr(null);

        // Realtime (make sure Realtime is enabled for the table)
        channel = supabase
          .channel(`words-ch-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'words',
              filter: `user_id=eq.${session.user.id}`,
            },
            async () => {
              const fresh = await loadWords();
              setWords(fresh);
              setLastOp(`realtime refresh (${fresh.length})`);
            },
          )
          .subscribe();
      } catch (e) {
        setLastOp('cloud load error');
        setLastErr(e?.message || e);
        console.error('[cloud] initial load failed', e);
      }
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [useCloud, session?.user]);

  // ---------- utils ----------
  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch {}
  };

  // ---------- actions: words ----------
  const addWord = async () => {
    if (!form.word.trim() || !form.translation.trim()) return;
    const entry = {
      id: uid(),
      word: form.word.trim(),
      translation: form.translation.trim(),
      category: form.category,
      difficulty: form.difficulty,
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      nextReview: todayISO(),
      createdAt: todayISO(),
      ipa: form.ipa || '',
      mnemonic: form.mnemonic || '',
      imageUrl: form.imageUrl || '',
      modes: form.modes ?? { flashcard: true, spelling: true },
      updated_at: new Date().toISOString(),
    };

    setWords((w) => [entry, ...w]);
    setForm({
      word: '',
      translation: '',
      category: 'noun',
      difficulty: 'easy',
      ipa: '',
      mnemonic: '',
      imageUrl: '',
      modes: { flashcard: true, spelling: true },
    });

    if (useCloud) {
      setLastOp('add → cloud');
      setLastErr(null);
      upsertWord(session.user.id, entry)
        .then(() => setLastOp('add saved'))
        .catch((e) => {
          setLastOp('add error');
          setLastErr(e?.message || e);
        });
    }
  };

  const delWord = async (id) => {
    setWords((w) => w.filter((x) => x.id !== id));
    setIdx(0);
    if (useCloud) {
      setLastOp('delete → cloud');
      setLastErr(null);
      cloudDeleteWord(id)
        .then(() => setLastOp('delete saved'))
        .catch((e) => {
          setLastOp('delete error');
          setLastErr(e?.message || e);
        });
    }
  };

  const startEdit = (wordObj) => {
    setForm({
      word: wordObj.word || '',
      translation: wordObj.translation || '',
      category: wordObj.category || 'noun',
      difficulty: wordObj.difficulty || 'easy',
      ipa: wordObj.ipa || '',
      mnemonic: wordObj.mnemonic || '',
      imageUrl: wordObj.imageUrl || '',
      modes: wordObj.modes ?? { flashcard: true, spelling: true },
    });
    setEditingId(wordObj.id);
    setShowManager(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    let updated;
    setWords((prev) =>
      prev.map((w) => {
        if (w.id !== editingId) return w;
        updated = {
          ...w,
          word: form.word.trim(),
          translation: form.translation.trim(),
          category: form.category,
          difficulty: form.difficulty,
          ipa: form.ipa || '',
          mnemonic: form.mnemonic || '',
          imageUrl: form.imageUrl || '',
          modes: form.modes ?? { flashcard: true, spelling: true },
          updated_at: new Date().toISOString(),
        };
        return updated;
      }),
    );
    setEditingId(null);
    setForm({
      word: '',
      translation: '',
      category: 'noun',
      difficulty: 'easy',
      ipa: '',
      mnemonic: '',
      imageUrl: '',
      modes: { flashcard: true, spelling: true },
    });

    if (useCloud && updated) {
      setLastOp('edit → cloud');
      setLastErr(null);
      upsertWord(session.user.id, updated)
        .then(() => setLastOp('edit saved'))
        .catch((e) => {
          setLastOp('edit error');
          setLastErr(e?.message || e);
        });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      word: '',
      translation: '',
      category: 'noun',
      difficulty: 'easy',
      ipa: '',
      mnemonic: '',
      imageUrl: '',
      modes: { flashcard: true, spelling: true },
    });
  };

  // ---------- actions: SRS grading (SM-2 style via scheduleCard) ----------
  const grade = async (correct) => {
    if (!current) return;

    const nextObj = {
      ...current,
      ...scheduleCard(current, !!correct),
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => prev.map((w) => (w.id === current.id ? nextObj : w)));

    setReviewLog((log) => [
      ...log,
      {
        id: current.id,
        word: current.word,
        correct: !!correct,
        date: todayISO(),
        mode: 'flashcard',
      },
    ]);

    if (correct) setProgress((p) => clamp(p + 5, 0, 100));

    setShowAnswer(false);
    setSpellInput('');
    setSpellMsg(null);
    setHintTokens([]);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));

    if (useCloud) {
      setLastOp('grade → cloud');
      setLastErr(null);
      Promise.all([
        upsertWord(session.user.id, nextObj),
        insertReview(session.user.id, {
          word_id: nextObj.id,
          correct: !!correct,
          mode: 'flashcard',
        }),
      ])
        .then(() => setLastOp('grade saved'))
        .catch((e) => {
          setLastOp('grade error');
          setLastErr(e?.message || e);
        });
    }
  };

  // ---------- import/export: words ----------
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'words.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Not an array');
      if (
        data.length &&
        data[0] &&
        typeof data[0] === 'object' &&
        'a' in data[0] &&
        'b' in data[0]
      ) {
        alert('Detected minimal pairs JSON. Use "Import Pairs" instead.');
        e.target.value = '';
        return;
      }
      const normalized = data.map((item) =>
        typeof item === 'string'
          ? {
              id: uid(),
              word: item,
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
              updated_at: new Date().toISOString(),
            }
          : {
              id: uid(),
              interval: 0,
              ease: 2.5,
              reps: 0,
              lapses: 0,
              nextReview: todayISO(),
              createdAt: todayISO(),
              category: (item.partOfSpeech || 'noun').toLowerCase(),
              difficulty: item.difficulty || 'medium',
              translation: item.translation ?? item.definition ?? '',
              word: item.word ?? '',
              example: item.example ?? '',
              ipa: item.ipa || '',
              mnemonic: item.mnemonic || '',
              imageUrl: item.imageUrl || '',
              modes: item.modes ?? { flashcard: true, spelling: true },
              updated_at: new Date().toISOString(),
            },
      );
      setWords((w) => [...normalized, ...w]);
      e.target.value = '';

      if (useCloud) {
        setLastOp('import → cloud');
        setLastErr(null);
        for (const nw of normalized) {
          // fire-and-forget; errors will show in panel
          upsertWord(session.user.id, nw).catch((err) => {
            setLastOp('import error');
            setLastErr(err?.message || err);
          });
        }
      }
    } catch (err) {
      alert('Invalid JSON. Expect an array of words or objects.');
      console.error(err);
    }
  };

  // ---------- B2 pack ----------
  const mapB2 = (it) => ({
    id: uid(),
    word: it.word,
    translation: it.definition || '',
    category: (it.partOfSpeech || 'expression').toLowerCase(),
    difficulty: 'medium',
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    nextReview: todayISO(),
    createdAt: todayISO(),
    example: it.example || '',
    modes: { flashcard: true, spelling: true },
    updated_at: new Date().toISOString(),
  });
  const loadB2Pack = async () => {
    const existing = new Set(words.map((w) => safeLower(w.word)));
    const newcomers = B2_PACK.filter((it) => it.word && !existing.has(safeLower(it.word))).map(
      mapB2,
    );
    if (!newcomers.length) {
      alert('B2 pack: no new words to add (all exist).');
      return;
    }
    setWords((w) => [...newcomers, ...w]);
    alert(`B2 pack loaded: added ${newcomers.length} words.`);
    if (useCloud) {
      setLastOp('B2 → cloud');
      setLastErr(null);
      for (const nw of newcomers) {
        upsertWord(session.user.id, nw).catch((e) => {
          setLastOp('B2 error');
          setLastErr(e?.message || e);
        });
      }
    }
  };

  // ---------- spelling helpers ----------
  const checkSpelling = () => {
    if (!current) return;
    const target = (current.word || '').toLowerCase().trim();
    const guess = (spellInput || '').toLowerCase().trim();
    if (!guess) {
      setSpellMsg({ type: 'bad', text: 'Type your answer above.' });
      setHintTokens([]);
      return;
    }
    const { distance, tokens } = levenshtein(guess, target);
    setHintTokens(tokens);
    if (distance === 0) {
      setSpellMsg({ type: 'good', text: 'Perfect!' });
      grade(true);
    } else if (distance <= 2) {
      setSpellMsg({ type: 'close', text: `Almost! (${distance} letter off)` });
    } else {
      setSpellMsg({ type: 'bad', text: 'Not quite. Check highlighted letters.' });
    }
  };
  const clearSpelling = () => {
    setSpellInput('');
    setSpellMsg(null);
    setHintTokens([]);
  };

  // ---------- speech recognition ----------
  const recRef = useRef(null);
  const srAvailable =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const startSR = () => {
    if (!srAvailable) {
      alert('Speech Recognition not available in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const said = (e.results[0][0].transcript || '').toLowerCase().trim();
      if (!current) return;
      const target = (current.word || '').toLowerCase().trim();
      if (said === target) {
        alert('✅ Nice! Pronounced correctly');
        grade(true);
      } else {
        alert(`Heard: "${said}" — target: "${target}"`);
      }
    };
    rec.onerror = () => {
      alert('SR error. Try again.');
    };
    rec.onend = () => {
      recRef.current = null;
    };
    recRef.current = rec;
    rec.start();
  };

  // ---------- ear training ----------
  const playPair = () => {
    if (!currentPair) return;
    const which = Math.random() < 0.5 ? 'a' : 'b';
    setMpPlayed(which);
    setMpMsg(null);
    const text = which === 'a' ? currentPair.a : currentPair.b;
    speak(text);
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

  // ---------- pairs import/export ----------
  const exportPairs = () => {
    const blob = new Blob([JSON.stringify(minimalPairs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minimal_pairs.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImportPairs = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('not array');
      const cleaned = data
        .filter((p) => p && typeof p === 'object' && p.a && p.b)
        .map((p) => ({
          a: String(p.a),
          b: String(p.b),
          ipa: p.ipa || '',
          focus: p.focus || 'custom',
        }));
      if (!cleaned.length) {
        alert('No valid pairs found.');
        return;
      }
      setMinimalPairs((prev) => [...prev, ...cleaned]);
      alert(`Imported ${cleaned.length} minimal pairs.`);
      e.target.value = '';
    } catch {
      alert('Invalid JSON for minimal pairs. Expect array of {a,b,ipa?,focus?}');
    }
  };

  // ---------- debug panel handlers ----------
  const handlePing = async () => {
    setLastOp('ping');
    setLastErr(null);
    const { error, count } = await pingSupabase();
    if (error) setLastErr(error.message || error);
    else setLastOp(`ping ok (rows: ${count ?? '?'})`);
  };

  const handleLoad = async () => {
    setLastOp('load');
    setLastErr(null);
    try {
      const data = await loadWords();
      setWords(data);
      setLastOp(`load ok (${data.length})`);
    } catch (e) {
      setLastErr(e.message || e);
    }
  };

  const handleTestInsert = async () => {
    setLastOp('insert');
    setLastErr(null);
    try {
      const { data, error } = await testInsertWord(session?.user?.id || null);
      if (error) throw error;
      if (data?.[0]) setWords((w) => [data[0], ...w]);
      setLastOp('insert ok');
    } catch (e) {
      setLastErr(e.message || e);
    }
  };

  // ---------- render ----------
  return (
    <div style={styles.viewport}>
      <div style={styles.centerWrap}>
        <div style={styles.appCard}>
          <HeaderBar
            onExport={exportJSON}
            onImport={onImportFile}
            onAddWords={() => setShowManager(true)}
            onLoadB2={loadB2Pack}
            onOpenSettings={() => setSettingsOpen(true)}
            onExportPairs={exportPairs}
            onImportPairs={onImportPairs}
          />
          <AuthBar session={session} />
          {/* Reader (LingQ-style) */}
          <Reader
            words={words}
            onAddWord={(entry) => {
              const newWord = {
                id: uid(),
                word: (entry.word ?? entry.front ?? '').trim(),
                translation: (entry.translation ?? entry.back ?? '').trim(),
                category: entry.category || 'noun',
                difficulty: entry.difficulty || 'medium',
                ipa: entry.ipa || '',
                mnemonic: entry.mnemonic || '',
                imageUrl: entry.imageUrl || '',
                modes: entry.modes ?? { flashcard: true, spelling: true },
                interval: 0,
                ease: 2.5,
                reps: 0,
                lapses: 0,
                nextReview: todayISO(),
                createdAt: todayISO(),
                updated_at: new Date().toISOString(),
              };
              setWords((w) => [newWord, ...w]);
              if (useCloud)
                upsertWord(session.user.id, newWord).catch((e) => {
                  setLastOp('reader add error');
                  setLastErr(e?.message || e);
                });
            }}
            speak={speak}
          />

          <main style={styles.body}>
            {/* Progress */}
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.h2}>Progress</div>
              <div style={styles.progressShell}>
                <div style={styles.progressFill(progress)} />
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {progress}% complete • {filteredDue.length} due (filtered) / {words.length} total
              </div>
            </div>

            <Filters
              filterCat={filterCat}
              setFilterCat={setFilterCat}
              filterDiff={filterDiff}
              setFilterDiff={setFilterDiff}
            />

            {/* Main row: Flashcards + Speak */}
            <div style={styles.row}>
              <Flashcard
                current={current}
                pictureOnly={pictureOnly}
                showAnswer={showAnswer}
                setShowAnswer={setShowAnswer}
                speak={speak}
                grade={grade}
              />

              <SpeakPractice
                current={current}
                enableSR={enableSR}
                speak={speak}
                startSR={startSR}
                grade={grade}
              />
            </div>

            {/* Secondary row: Ear Training + Spelling (independent pool) */}
            <div style={styles.row}>
              <EarTraining
                currentPair={currentPair}
                speak={speak}
                playPair={playPair}
                guessPair={guessPair}
                mpMsg={mpMsg}
              />

              <SpellingGame
                words={spellingList}
                onCorrect={(w) => {
                  setReviewLog((log) => [
                    ...log,
                    { id: w.id, word: w.word, correct: true, date: todayISO(), mode: 'spelling' },
                  ]);
                  if (useCloud)
                    insertReview(session.user.id, {
                      word_id: w.id,
                      correct: true,
                      mode: 'spelling',
                    }).catch((e) => {
                      setLastOp('spell review error');
                      setLastErr(e?.message || e);
                    });
                }}
                onIncorrect={(w) => {
                  setReviewLog((log) => [
                    ...log,
                    { id: w.id, word: w.word, correct: false, date: todayISO(), mode: 'spelling' },
                  ]);
                  if (useCloud)
                    insertReview(session.user.id, {
                      word_id: w.id,
                      correct: false,
                      mode: 'spelling',
                    }).catch((e) => {
                      setLastOp('spell review error');
                      setLastErr(e?.message || e);
                    });
                }}
              />
            </div>

            {/* Statistics */}
            <section style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.h2}>Statistics</div>
              <Statistics words={words} reviewLog={reviewLog} />
            </section>
          </main>
        </div>
      </div>

      {/* Modals */}
      <WordManagerModal
        open={showManager}
        onClose={() => {
          setShowManager(false);
          cancelEdit();
        }}
        form={form}
        setForm={setForm}
        words={words}
        addWord={addWord}
        delWord={delWord}
        speak={speak}
        editingId={editingId}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        targetSounds={targetSounds}
        setTargetSounds={setTargetSounds}
        enableSR={enableSR}
        setEnableSR={setEnableSR}
        pictureOnly={pictureOnly}
        setPictureOnly={setPictureOnly}
      />

      {/* Debug */}
      <DebugPanel
        session={session}
        lastOp={lastOp}
        lastError={lastErr}
        onPing={handlePing}
        onLoad={handleLoad}
        onTestInsert={handleTestInsert}
      />
    </div>
  );
}
