// src/pages/ReadingWords.jsx
import React, { useMemo, useState } from "react";
import { getStatuses, setStatus } from "../utils/statusStore";
import { bus } from "../utils/bus";
import styles from "../styles";

function toList(mapObj) {
  // mapObj is an object: { lemma: status }
  return Object.entries(mapObj || {}).map(([lemma, status]) => ({ lemma, status }));
}

export default function ReadingWords({ onAddWord, deck = [] }) {
  const [statuses, setStatusesState] = useState(() => getStatuses());
  const [filter, setFilter] = useState("learning"); // default like LingQ

  const list = useMemo(() => {
    const base = toList(statuses);
    return base
      .filter((x) => (filter === "all" ? true : x.status === filter))
      .sort((a, b) => a.lemma.localeCompare(b.lemma));
  }, [statuses, filter]);

  const inDeck = (lemma) =>
    deck.some((w) => (w.word || "").toLowerCase() === lemma.toLowerCase());

  const addWord = (lemma) => {
    onAddWord?.({
      word: lemma,
      translation: "",
      category: "noun",
      difficulty: "easy",
      ipa: "",
      mnemonic: "",
      imageUrl: "",
      modes: { flashcard: true, spelling: true },
    });
  };

  const changeStatus = (lemma, s) => {
    const next = setStatus(lemma, s);
    setStatusesState(next);
    if (s === "learning") {
      // count as “LingQ created”
      queueMicrotask(() => {
        bus.dispatchEvent(new CustomEvent("lingq-created", { detail: { lemma } }));
      });
    }
  };

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={styles.h2}>Vocabulary from Reading</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}
        >
          <option value="all">All</option>
          <option value="unknown">Unknown</option>
          <option value="learning">Learning</option>
          <option value="known">Known</option>
          <option value="ignored">Ignored</option>
        </select>

        <button
          style={styles.ghost}
          onClick={() => {
            // quick action: add all Learning words to deck (skip ones already present)
            const targets = toList(statuses)
              .filter((x) => x.status === "learning" && !inDeck(x.lemma))
              .map((x) => x.lemma);
            targets.forEach(addWord);
          }}
        >
          + Add all Learning to deck
        </button>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc" }}>
              <th style={th}>Word</th>
              <th style={th}>Status</th>
              <th style={th}>In Deck?</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.lemma} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={td}>{row.lemma}</td>
                <td style={td}>
                  <select
                    value={row.status}
                    onChange={(e) => changeStatus(row.lemma, e.target.value)}
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 8px" }}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="learning">Learning</option>
                    <option value="known">Known</option>
                    <option value="ignored">Ignored</option>
                  </select>
                </td>
                <td style={td}>{inDeck(row.lemma) ? "✅" : "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {!inDeck(row.lemma) && (
                    <button style={styles.ghost} onClick={() => addWord(row.lemma)}>
                      + Add to deck
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...td, color: "#64748b" }}>
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const th = { padding: "10px 12px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#64748b" };
const td = { padding: "10px 12px", fontSize: 14, color: "#0f172a" };