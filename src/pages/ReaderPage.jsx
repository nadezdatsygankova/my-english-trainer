// src/pages/ReaderPage.jsx
import React from "react";
import Reader from "../components/Reader";
import { uid, todayISO } from "../utils"; // or inline tiny helpers if you prefer
import { upsertWord } from "../utils/cloud";

export default function ReaderPage({ words, setWords, speak, session }) {
  return (
    <div style={{maxWidth: 900, margin: "0 auto"}}>
      <h1 style={{marginBottom: 12}}>Reader</h1>
      <p style={{marginTop: -6, marginBottom: 16, color: "#475569"}}>
        Paste text or upload .txt, highlight words to translate and add to your deck.
      </p>

      <Reader
        words={words}
        speak={speak}
        onAddWord={(entry) => {
          const newWord = {
            id: uid(),
            word: (entry.word ?? entry.front ?? "").trim(),
            translation: (entry.translation ?? entry.back ?? "").trim(),
            category: entry.category || "noun",
            difficulty: entry.difficulty || "medium",
            modes: entry.modes ?? { flashcard: true, spelling: true },
            interval: 0, ease: 2.5, reps: 0, lapses: 0,
            nextReview: todayISO(), createdAt: todayISO(),
          };
          setWords((prev) => [newWord, ...prev]);
          if (session?.user) {
            upsertWord(session.user.id, newWord).catch(() => {});
          }
        }}
      />
    </div>
  );
}