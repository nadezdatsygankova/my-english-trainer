import React, { useState, useEffect } from 'react';

const defaultWords = [
  {
    word: 'cold',
    translation: 'холодный',
    category: 'adjective',
    difficulty: 'easy',
    interval: 1,
    dueDate: Date.now() - 1000, // already due
    createdAt: Date.now(),
  },
];

const getToday = () => new Date().setHours(0, 0, 0, 0);

export default function EnglishLearningApp() {
  const [words, setWords] = useState(() => {
    const saved = localStorage.getItem('words');
    return saved ? JSON.parse(saved) : defaultWords;
  });
  const [newWord, setNewWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  const dueFlashcards = words.filter(
    (w) => new Date(w.dueDate).getTime() <= getToday()
  );

  const currentCard = dueFlashcards[0];

  const updateWords = (updated) => {
    setWords(updated);
    localStorage.setItem('words', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newWord.trim()) return;
    const newEntry = {
      word: newWord,
      translation,
      category,
      difficulty,
      interval: 1,
      dueDate: Date.now(),
      createdAt: Date.now(),
    };
    updateWords([newEntry, ...words]);
    setNewWord('');
    setTranslation('');
    setCategory('');
    setDifficulty('');
  };

  const handleMarkCorrect = () => {
    const updated = words.map((w) =>
      w.word === currentCard.word
        ? {
            ...w,
            interval: w.interval * 2,
            dueDate: Date.now() + w.interval * 24 * 60 * 60 * 1000,
          }
        : w
    );
    updateWords(updated);
    setShowAnswer(false);
  };

  const handleMarkWrong = () => {
    const updated = words.map((w) =>
      w.word === currentCard.word
        ? { ...w, interval: 1, dueDate: Date.now() + 24 * 60 * 60 * 1000 }
        : w
    );
    updateWords(updated);
    setShowAnswer(false);
  };

  const handleDelete = (word) => {
    const updated = words.filter((w) => w.word !== word);
    updateWords(updated);
  };

  return (
    <div className="p-6 max-w-xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">📘 Learn English Daily</h1>

      <div className="mb-6 border p-4 rounded shadow">
        <h2 className="text-xl font-semibold">Add New Word</h2>
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Word"
          className="border px-2 py-1 mr-2 mt-2"
        />
        <input
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Translation"
          className="border px-2 py-1 mr-2 mt-2"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="border px-2 py-1 mr-2 mt-2"
        />
        <input
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          placeholder="Difficulty"
          className="border px-2 py-1 mr-2 mt-2"
        />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 py-1 mt-2">
          Add
        </button>
      </div>

      {currentCard ? (
        <div className="border p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">Flashcard</h2>
          <p className="text-lg">{currentCard.word}</p>
          {showAnswer ? (
            <>
              <p className="text-green-600 font-bold">{currentCard.translation}</p>
              <button onClick={handleMarkCorrect} className="bg-green-500 text-white px-4 py-1 mt-2 mr-2">
                ✅ Correct
              </button>
              <button onClick={handleMarkWrong} className="bg-red-500 text-white px-4 py-1 mt-2">
                ❌ Wrong
              </button>
            </>
          ) : (
            <button onClick={() => setShowAnswer(true)} className="bg-blue-500 text-white px-4 py-1 mt-2">
              Show Answer
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-500 italic mb-6">🎉 No flashcards due today!</p>
      )}

      <div className="border p-4 rounded shadow">
        <h2 className="text-xl font-semibold">📚 My Words</h2>
        <ul className="mt-2 text-left">
          {words.map((w, i) => (
            <li key={i} className="border-b py-1">
              <strong>{w.word}</strong> - {w.translation} [{w.category}/{w.difficulty}]
              <button
                className="text-red-500 ml-2 text-sm"
                onClick={() => handleDelete(w.word)}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}