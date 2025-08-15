import { useEffect, useState } from "react";

export default function EnglishApp() {
  const [progress, setProgress] = useState(() => {
    return parseInt(localStorage.getItem("progress")) || 30;
  });
  const [wordList, setWordList] = useState(() => {
    return JSON.parse(localStorage.getItem("wordList") || "[]");
  });
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState("noun");
  const [newDifficulty, setNewDifficulty] = useState("easy");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
      setProgress((prev) => Math.min(prev + 10, 100));
    } else {
      alert("Try again!");
    }
  };

  const handleAddWord = () => {
    if (newWord.trim()) {
      const newEntry = {
        word: newWord.trim(),
        category: newCategory,
        difficulty: newDifficulty,
      };
      setWordList((prev) => [...prev, newEntry]);
      setNewWord("");
      setNewCategory("noun");
      setNewDifficulty("easy");
    }
  };

  const handleDeleteWord = (indexToDelete) => {
    const updatedList = wordList.filter((_, i) => i !== indexToDelete);
    setWordList(updatedList);
  };

  const filteredWords = wordList.filter((entry) => {
    return (
      (filterCategory === "all" || entry.category === filterCategory) &&
      (filterDifficulty === "all" || entry.difficulty === filterDifficulty) &&
      entry.word.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={styles.wrapper}>
      <h1>📘 Learn English Daily</h1>
      <p>Interactive learning with progress tracking</p>

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
        {quiz.options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelectedOption(i)}
            style={{
              ...styles.optionBtn,
              backgroundColor: selectedOption === i ? "#3b82f6" : "#f3f4f6",
              color: selectedOption === i ? "#fff" : "#000",
            }}
          >
            {option}
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
            style={{ marginRight: "0.5rem", padding: "0.5rem", width: "25%" }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ marginRight: "0.5rem", padding: "0.5rem" }}
          >
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="expression">Expression</option>
          </select>
          <select
            value={newDifficulty}
            onChange={(e) => setNewDifficulty(e.target.value)}
            style={{ marginRight: "0.5rem", padding: "0.5rem" }}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={handleAddWord}>Add</button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "0.5rem", marginRight: "0.5rem" }}
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="expression">Expression</option>
          </select>
          <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} style={{ marginLeft: "0.5rem" }}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <ul>
          {filteredWords.map((entry, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span>
                <strong>{entry.word}</strong>{" "}
                <em>({entry.category}, {entry.difficulty})</em>
              </span>
              <button
                onClick={() => handleDeleteWord(i)}
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "0.3rem 0.6rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 700,
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "sans-serif",
  },
  progressBar: {
    background: "#e5e7eb",
    borderRadius: 999,
    height: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    background: "#3b82f6",
    transition: "width 0.3s ease",
  },
  card: {
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "1.5rem",
    borderRadius: "0.5rem",
    marginBottom: "1.5rem",
  },
  optionBtn: {
    display: "block",
    width: "100%",
    padding: "0.5rem",
    borderRadius: "0.375rem",
    margin: "0.25rem 0",
    border: "none",
    cursor: "pointer",
  },
};