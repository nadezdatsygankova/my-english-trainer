
import React, { useState, useEffect } from 'react';

const defaultFlashcards = [
  { word: 'cold', translation: 'холодный', level: 0, lastReviewed: null },
  { word: 'hot', translation: 'горячий', level: 0, lastReviewed: null },
];

export default function EnglishLearningApp() {
  const [flashcards, setFlashcards] = useState(() => {
    const saved = localStorage.getItem("flashcards");
    return saved ? JSON.parse(saved) : defaultFlashcards;
  });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  const today = new Date().toDateString();
  const dueFlashcards = flashcards.filter(card => !card.lastReviewed || card.lastReviewed !== today);

  const handleAnswer = (correct) => {
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex].lastReviewed = today;
    updatedCards[currentCardIndex].level += correct ? 1 : 0;
    setFlashcards(updatedCards);
    setShowAnswer(false);
    setCurrentCardIndex((prev) => (prev + 1) % dueFlashcards.length);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      setFlashcards(data);
      setImportText("");
    } catch (e) {
      alert("Invalid JSON format.");
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(flashcards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards.json";
    a.click();
  };

  const exportCSV = () => {
    const header = "word,translation,level,lastReviewed\n";
    const rows = flashcards.map(card =>
      [card.word, card.translation, card.level, card.lastReviewed].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards.csv";
    a.click();
  };

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>📘 Learn English Daily</h1>
      <p>Flashcards due today: {dueFlashcards.length} / {flashcards.length}</p>

      {dueFlashcards.length > 0 ? (
        <div style={{ border: "1px solid #ccc", padding: 20, marginTop: 20, borderRadius: 8 }}>
          <h3>{dueFlashcards[currentCardIndex].word}</h3>
          <button onClick={() => speakWord(dueFlashcards[currentCardIndex].word)}>🔊 Speak</button>
          <div style={{ marginTop: 10 }}>
            {showAnswer ? <p><strong>{dueFlashcards[currentCardIndex].translation}</strong></p> : null}
            <button onClick={() => setShowAnswer(true)}>Show Answer</button>
            {showAnswer && (
              <>
                <button onClick={() => handleAnswer(true)}>✅ Correct</button>
                <button onClick={() => handleAnswer(false)}>❌ Wrong</button>
              </>
            )}
          </div>
        </div>
      ) : <p>🎉 No flashcards due today!</p>}

      <hr style={{ margin: "2rem 0" }} />

      <h3>📤 Import Flashcards</h3>
      <textarea
        rows="4"
        cols="50"
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder='Paste JSON flashcards here'
      />
      <br />
      <button onClick={handleImport}>Import</button>

      <h3>📥 Export Flashcards</h3>
      <button onClick={exportJSON}>Export as JSON</button>
      <button onClick={exportCSV}>Export as CSV</button>
    </div>
  );
}
