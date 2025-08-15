import { useEffect, useState } from "react";

export default function EnglishAppWithSR() {
  const [progress, setProgress] = useState(() => parseInt(localStorage.getItem("progress")) || 30);
  const [wordList, setWordList] = useState(() => JSON.parse(localStorage.getItem("wordList") || "[]"));
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState("noun");
  const [newDifficulty, setNewDifficulty] = useState("easy");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState(false);

  useEffect(() => {
    localStorage.setItem("progress", progress);
  }, [progress]);

  useEffect(() => {
    localStorage.setItem("wordList", JSON.stringify(wordList));
  }, [wordList]);

  const flashcard = {
    question: "What’s the opposite of 'cold'?",
    answer: "Hot",
  };

  const quiz = {
    question: "Choose the correct sentence:",
    options: ["She go to school.", "She goes to school."],
    answer: 1,
  };

  const handleSubmitQuiz = () => {
    if (selectedOption === quiz.answer) {
      alert("Correct!");
      setProgress(prev => Math.min(prev + 10, 100));
    } else {
      alert("Try again!");
    }
  };

  const handleAddWord = () => {
    if (newWord.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const newEntry = {
        word: newWord.trim(),
        category: newCategory,
        difficulty: newDifficulty,
        nextReview: today,
        interval: 1,
      };
      setWordList(prev => [...prev, newEntry]);
      setNewWord("");
      setNewCategory("noun");
      setNewDifficulty("easy");
    }
  };

  const handleDeleteWord = (index) => {
    setWordList(prev => prev.filter((_, i) => i !== index));
  };

  const todayDate = new Date().toISOString().split('T')[0];

  const filteredWords = wordList.filter(entry => {
    return (
      (filterCategory === "all" || entry.category === filterCategory) &&
      (filterDifficulty === "all" || entry.difficulty === filterDifficulty) &&
      (!filterDueOnly || !entry.nextReview || entry.nextReview <= todayDate) &&
      entry.word.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const reviewWord = (index, correct) => {
    const newList = [...wordList];
    const word = newList[index];
    const today = new Date();
    const newInterval = correct ? word.interval * 2 : 1;
    const nextDate = new Date(today.setDate(today.getDate() + newInterval)).toISOString().split('T')[0];
    word.nextReview = nextDate;
    word.interval = newInterval;
    setWordList(newList);
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(wordList, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocabulary.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (Array.isArray(imported)) {
          setWordList(imported);
        } else {
          alert("Invalid format");
        }
      } catch (err) {
        alert("Error reading file");
      }
    };
    if (file) reader.readAsText(file);
  };

  return (
    <div style={styles.wrapper}>
      <h1>📘 Learn English Daily</h1>
      <p>Interactive learning with spaced repetition & export/import</p>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressInner, width: `${progress}%` }}></div>
      </div>

      <div style={styles.card}>
        <h2>Flashcard</h2>
        <p>{flashcard.question}</p>
        {showAnswer ? (
          <p style={{ color: "green", fontWeight: "bold" }}>{flashcard.answer}</p>
        ) : (
          <button onClick={() => setShowAnswer(true)}>Show Answer</button>
        )}
      </div>

      <div style={styles.card}>
        <h2>Quiz</h2>
        <p>{quiz.question}</p>
        {quiz.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelectedOption(i)}
            style={{
              ...styles.optionBtn,
              backgroundColor: selectedOption === i ? "#3b82f6" : "#f3f4f6",
              color: selectedOption === i ? "#fff" : "#000",
            }}
          >
            {opt}
          </button>
        ))}
        <button onClick={handleSubmitQuiz}>Submit</button>
      </div>

      <div style={styles.card}>
        <h2>📚 My Words</h2>
        <div style={{ marginBottom: "1rem" }}>
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Enter new word"
            style={{ padding: "0.5rem", marginRight: "0.5rem", width: "25%" }}
          />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ marginRight: "0.5rem" }}>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="expression">Expression</option>
          </select>
          <select value={newDifficulty} onChange={e => setNewDifficulty(e.target.value)} style={{ marginRight: "0.5rem" }}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={handleAddWord}>Add</button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ marginLeft: "0.5rem" }}>
            <option value="all">All Categories</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="expression">Expression</option>
          </select>
          <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} style={{ marginLeft: "0.5rem" }}>
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <label style={{ marginLeft: "1rem" }}>
            <input type="checkbox" checked={filterDueOnly} onChange={() => setFilterDueOnly(prev => !prev)} /> Due only
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button onClick={exportJSON}>📤 Export</button>
          <input type="file" accept=".json" onChange={importJSON} style={{ marginLeft: "1rem" }} />
        </div>

        <ul>
          {filteredWords.map((entry, i) => (
            <li key={i} style={{ marginBottom: "0.5rem" }}>
              <span>
                <strong>{entry.word}</strong> ({entry.category}, {entry.difficulty}){" "}
                <small>next: {entry.nextReview}</small>
              </span>
              <div style={{ marginTop: "0.25rem" }}>
                <button onClick={() => reviewWord(i, true)} style={{ marginRight: "0.5rem" }}>✅ Correct</button>
                <button onClick={() => reviewWord(i, false)} style={{ marginRight: "0.5rem" }}>❌ Wrong</button>
                <button onClick={() => handleDeleteWord(i)} style={{ backgroundColor: "#ef4444", color: "white", padding: "0.3rem", borderRadius: "4px" }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 700, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" },
  progressBar: { background: "#e5e7eb", borderRadius: 999, height: 16, marginBottom: 24, overflow: "hidden" },
  progressInner: { height: "100%", background: "#3b82f6", transition: "width 0.3s ease" },
  card: { background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "1.5rem" },
  optionBtn: { display: "block", width: "100%", padding: "0.5rem", borderRadius: "0.375rem", margin: "0.25rem 0", border: "none", cursor: "pointer" },
};