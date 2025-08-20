import React from "react";
import styles from "../styles";
import { suggestMnemonic } from "../utils/mnemonics";

/**
 * WordManagerModal
 * Props MUST match App.jsx:
 *   open, onClose, form, setForm, words, addWord, delWord, speak,
 *   editingId, onStartEdit, onSaveEdit, onCancelEdit
 */
export default function WordManagerModal({
  open,
  onClose,
  form,
  setForm,
  words,
  addWord,
  delWord,
  speak,
  editingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  if (!open) return null;
  const isEditing = Boolean(editingId);
  const modes = form.modes || { flashcard: true, spelling: true };

  // close only when clicking the dark backdrop
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={{ ...styles.modalBackdrop, zIndex: 9998 }} onClick={onBackdrop}>
      <div
        style={{ ...styles.modal, zIndex: 9999, maxWidth: 820 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wm-title"
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
      >
        {/* Header (sticky) */}
        <div
          className="modal-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 id="wm-title" style={{ ...styles.h2, margin: 0 }}>
              {isEditing ? "Edit Word" : "Add / Manage Words"}
            </h2>
            {isEditing && (
              <span style={{ ...styles.badgeClose, background: "#e0e7ff", color: "#3730a3" }}>
                Editing
              </span>
            )}
          </div>
          <button type="button" style={styles.ghost} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="scroll-area" style={{ flex: 1 }}>
          <div className="modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Word */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-word" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Word
              </label>
              <input
                id="wm-word"
                className="ff-input"
                style={styles.input}
                value={form.word}
                onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                placeholder="liberty"
              />
            </div>

            {/* Translation */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-translation" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Meaning / Translation
              </label>
              <input
                id="wm-translation"
                className="ff-input"
                style={styles.input}
                value={form.translation}
                onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
                placeholder="свобода"
              />
            </div>

            {/* IPA */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-ipa" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                IPA (optional)
              </label>
              <input
                id="wm-ipa"
                className="ff-input"
                style={styles.input}
                placeholder="/ˈlɪbərti/"
                value={form.ipa || ""}
                onChange={(e) => setForm((f) => ({ ...f, ipa: e.target.value }))}
              />
            </div>

            {/* Mnemonic */}
            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-mnemonic" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Mnemonic (optional)
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                <input
                  id="wm-mnemonic"
                  className="ff-input"
                  style={{ ...styles.input, flex: "1 1 240px", minWidth: 0 }}
                  placeholder="Your personal image/story"
                  value={form.mnemonic || ""}
                  onChange={(e) => setForm((f) => ({ ...f, mnemonic: e.target.value }))}
                />
                <button
                  type="button"
                  style={styles.ghost}
                  onClick={() => setForm((f) => ({ ...f, mnemonic: suggestMnemonic(f.word, f.translation) }))}
                >
                  Suggest
                </button>
              </div>
            </div>

            {/* Image URL */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-image" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Image URL (optional)
              </label>
              <input
                id="wm-image"
                className="ff-input"
                style={styles.input}
                placeholder="https://…"
                value={form.imageUrl || ""}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-category" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Category
              </label>
              <select
                id="wm-category"
                className="ff-select"
                style={{ ...styles.input, appearance: "auto" }}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {["noun", "verb", "adjective", "adverb", "expression"].map((o) => (
                  <option key={o} value={o}>
                    {o[0].toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div style={{ minWidth: 0 }}>
              <label className="ff-label" htmlFor="wm-difficulty" style={{ display: "block", marginBottom: 6, color: "#0f172a", fontWeight: 600, fontSize: 13 }}>
                Difficulty
              </label>
              <select
                id="wm-difficulty"
                className="ff-select"
                style={{ ...styles.input, appearance: "auto" }}
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              >
                {["easy", "medium", "hard"].map((o) => (
                  <option key={o} value={o}>
                    {o[0].toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Modes */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={modes.flashcard}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modes: { ...modes, flashcard: e.target.checked } }))
                  }
                />
                <span>Use in Flashcards</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={modes.spelling}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modes: { ...modes, spelling: e.target.checked } }))
                  }
                />
                <span>Use in Spelling</span>
              </label>
            </div>
          </div>

          {/* Word list */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>My Words</div>
            <div>
              {words.length === 0 && <div style={{ color: "#64748b" }}>No words yet.</div>}
              {words.map((w) => (
                <div key={w.id} style={styles.listItem}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {w.word} {w.ipa && <span style={{ fontSize: 12, color: "#64748b" }}>({w.ipa})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {w.translation || "—"} • {w.category} • {w.difficulty}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Modes: {w.modes?.flashcard ? "Flashcards" : ""}
                      {w.modes?.flashcard && w.modes?.spelling ? " + " : ""}
                      {w.modes?.spelling ? "Spelling" : !w.modes?.flashcard ? "None" : ""}
                    </div>
                    {w.mnemonic && <div style={{ fontSize: 12, color: "#334155" }}>🧠 {w.mnemonic}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" style={styles.ghost} onClick={() => speak(w.word)} title="Speak">
                      🔊
                    </button>
                    <button type="button" style={styles.ghost} onClick={() => onStartEdit(w)} title="Edit">
                      ✏️ Edit
                    </button>
                    <button type="button" style={styles.danger} onClick={() => delWord(w.id)} title="Delete">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky actions */}
        <div
          className="modal-actions"
          style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            zIndex: 2,
            paddingTop: 10,
            marginTop: 12,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {isEditing ? (
            <>
              <button type="button" style={styles.primary} onClick={onSaveEdit}>
                💾 Save changes
              </button>
              <button type="button" style={styles.ghost} onClick={onCancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" style={styles.primary} onClick={addWord}>
                ＋ Add word
              </button>
              <button
                type="button"
                style={styles.ghost}
                onClick={() =>
                  setForm({
                    word: "",
                    translation: "",
                    category: "noun",
                    difficulty: "easy",
                    ipa: "",
                    mnemonic: "",
                    imageUrl: "",
                    modes: { flashcard: true, spelling: true },
                  })
                }
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}