// src/pages/Trainer.jsx
import React, { useEffect, useMemo, useState } from "react";
import Filters from "../components/Filters";
import Flashcard from "../components/Flashcard";
import EarTraining from "../components/EarTraining";
import SpellingGame from "../components/SpellingGame";
import { todayISO, clamp } from "../utils";
import { scheduleCard } from "../utils/scheduler";
import { appendReview } from "../utils/reviews";
import { bus } from "../utils/bus";

const DEFAULT_MINIMAL_PAIRS = [
  { a: "ship", b: "sheep", ipa: "/ʃɪp/ vs /ʃiːp/", focus: "ɪ vs iː" },
  { a: "bit", b: "beat", ipa: "/bɪt/ vs /biːt/", focus: "ɪ vs iː" },
  { a: "full", b: "fool", ipa: "/fʊl/ vs /fuːl/", focus: "ʊ vs uː" },
  { a: "bat", b: "bet", ipa: "/bæt/ vs /bɛt/", focus: "æ vs e" },
  { a: "rice", b: "lice", ipa: "/raɪs/ vs /laɪs/", focus: "r vs l" },
  { a: "thin", b: "then", ipa: "/θɪn/ vs /ðɛn/", focus: "θ vs ð" },
  { a: "throw", b: "though", ipa: "/θroʊ/ vs /ðoʊ/", focus: "θ vs ð" },
  { a: "coat", b: "goat", ipa: "/koʊt/ vs /goʊt/", focus: "k vs g" },
  { a: "fan", b: "van", ipa: "/fæn/ vs /væn/", focus: "f vs v" },
];

export default function Trainer() {
  // Words + progress
  const [words, setWords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("words-v1") || "[]"); }
    catch { return []; }
  });
  const [progress, setProgress] = useState(() => +localStorage.getItem("progress") || 0);

  // persist changes made here so other pages see them
  useEffect(() => { localStorage.setItem("words-v1", JSON.stringify(words)); }, [words]);
  useEffect(() => { localStorage.setItem("progress", String(progress)); }, [progress]);

  // Flashcards filters
  const [filterCat, setFilterCat] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [showAnswer, setShowAnswer] = useState(false);
  const [idx, setIdx] = useState(0);

  const dueList = useMemo(
    () => words.filter((w) => w.modes?.flashcard && (!w.nextReview || w.nextReview <= todayISO())),
    [words]
  );
  const filteredDue = useMemo(
    () =>
      dueList.filter(
        (w) =>
          (filterCat === "all" || w.category === filterCat) &&
          (filterDiff === "all" || w.difficulty === filterDiff)
      ),
    [dueList, filterCat, filterDiff]
  );
  const current = filteredDue[idx] ?? null;

  // Grade flashcards
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

    // log review (local) + notify Stats page
    const entry = {
      id: current.id,
      word: current.word,
      correct: !!correct,
      mode: "flashcard",
      date: todayISO(),
    };
    appendReview(entry);
    queueMicrotask(() => {
      bus.dispatchEvent(new CustomEvent("review-log-changed", { detail: { entry } }));
    });
  };

  // Minimal pairs
  const [minimalPairs, setMinimalPairs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("minimalPairs") || "null") || DEFAULT_MINIMAL_PAIRS; }
    catch { return DEFAULT_MINIMAL_PAIRS; }
  });
  const [targetSounds, setTargetSounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("targetSounds") || "[]"); }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem("minimalPairs", JSON.stringify(minimalPairs)); }, [minimalPairs]);
  useEffect(() => { localStorage.setItem("targetSounds", JSON.stringify(targetSounds)); }, [targetSounds]);

  const selectedFocuses = useMemo(() => {
    if (targetSounds?.length) return targetSounds;
    return Array.from(new Set(minimalPairs.map((p) => p.focus || "custom")));
  }, [targetSounds, minimalPairs]);

  const filteredPairs = useMemo(
    () => minimalPairs.filter((p) => selectedFocuses.includes(p.focus || "custom")),
    [minimalPairs, selectedFocuses]
  );

  const handleUseDefaults = () => {
    const uniq = Array.from(new Set(minimalPairs.map((p) => p.focus || "custom")));
    setTargetSounds(uniq);
    localStorage.setItem("targetSounds", JSON.stringify(uniq));
  };

  const [mpIndex, setMpIndex] = useState(0);
  const [mpPlayed, setMpPlayed] = useState(null);
  const [mpMsg, setMpMsg] = useState(null);

  const speak = (text) => {
    try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); }
    catch {}
  };

  const currentPair = filteredPairs.length ? filteredPairs[mpIndex % filteredPairs.length] : null;

  const playPair = () => {
    if (!currentPair) return;
    const which = Math.random() < 0.5 ? "a" : "b";
    setMpPlayed(which);
    setMpMsg(null);
    speak(which === "a" ? currentPair.a : currentPair.b);
  };
  const guessPair = (choice) => {
    if (!mpPlayed) { setMpMsg({ type: "bad", text: "Press Play first." }); return; }
    const correct = choice === mpPlayed;
    setMpMsg({ type: correct ? "good" : "bad", text: correct ? "Correct!" : "Not this one." });
    if (correct) setMpIndex((i) => i + 1);
  };

  // Spelling game pool
  const spellingList = useMemo(
    () =>
      words.filter(
        (w) =>
          w.modes?.spelling &&
          (filterCat === "all" || w.category === filterCat) &&
          (filterDiff === "all" || w.difficulty === filterDiff)
      ),
    [words, filterCat, filterDiff]
  );

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Progress */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Progress</h2>
        <div style={{ background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, background: "#3b82f6", height: 8 }} />
        </div>
        <div style={{ fontSize: 12, color: "#475569" }}>
          {progress}% complete • {filteredDue.length} due (filtered) / {words.length} total
        </div>
      </div>

      <Filters
        filterCat={filterCat}
        setFilterCat={setFilterCat}
        filterDiff={filterDiff}
        setFilterDiff={setFilterDiff}
      />

      {/* Flashcards */}
      <Flashcard
        current={current}
        showAnswer={showAnswer}
        setShowAnswer={setShowAnswer}
        speak={speak}
        grade={grade}
      />

      {/* Ear Training */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ear Training (Minimal Pairs)</h2>
        {filteredPairs.length === 0 ? (
          <div style={{ color: "#6b7280" }}>
            <p>Add target sounds in Settings or import pairs to begin.</p>
            <button
              onClick={handleUseDefaults}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
              }}
            >
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
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Spelling Practice</h2>
        <SpellingGame
          words={spellingList}
          onCorrect={(w) => {
            const entry = {
              id: w.id,
              word: w.word,
              correct: true,
              date: todayISO(),
              mode: "spelling",
            };
            appendReview(entry);
            queueMicrotask(() => {
              bus.dispatchEvent(new CustomEvent("review-log-changed", { detail: { entry } }));
            });
          }}
          onIncorrect={(w) => {
            const entry = {
              id: w.id,
              word: w.word,
              correct: false,
              date: todayISO(),
              mode: "spelling",
            };
            appendReview(entry);
            queueMicrotask(() => {
              bus.dispatchEvent(new CustomEvent("review-log-changed", { detail: { entry } }));
            });
          }}
        />
      </div>
    </section>
  );
}