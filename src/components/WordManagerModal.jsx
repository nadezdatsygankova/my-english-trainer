// src/components/WordManagerModal.jsx
import React, { useEffect, useRef } from "react";

export default function WordManagerModal({
  open,
  onClose,
  form,
  setForm,
  words,
  addWord,
  delWord,
  editingId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  const dlgRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // focus first field
    const t = setTimeout(() => {
      dlgRef.current?.querySelector("input[name='word']")?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const isEditing = !!editingId;
  const handleSubmit = (e) => {
    e.preventDefault();
    isEditing ? onSaveEdit() : addWord();
  };

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div
        className="wm-panel"
        ref={dlgRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit word" : "Add word"}
      >
        <header className="wm-head">
          <div className="wm-title">{isEditing ? "Edit Word" : "Add Word"}</div>
          <button className="wm-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form className="wm-body" onSubmit={handleSubmit}>
          <div className="wm-field">
            <label>Word</label>
            <input
              name="word"
              value={form.word}
              onChange={(e) => setForm({ ...form, word: e.target.value })}
              placeholder="e.g. liberty"
              required
              inputMode="latin"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="wm-field">
            <label>Translation</label>
            <input
              name="translation"
              value={form.translation}
              onChange={(e) => setForm({ ...form, translation: e.target.value })}
              placeholder="e.g. свобода"
              inputMode="latin"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="wm-row">
            <div className="wm-field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>noun</option>
                <option>verb</option>
                <option>adjective</option>
                <option>adverb</option>
                <option>expression</option>
              </select>
            </div>
            <div className="wm-field">
              <label>Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option>easy</option>
                <option>medium</option>
                <option>hard</option>
              </select>
            </div>
          </div>

          <div className="wm-row">
            <div className="wm-field">
              <label>IPA</label>
              <input
                value={form.ipa}
                onChange={(e) => setForm({ ...form, ipa: e.target.value })}
                placeholder="/ˈlɪbərti/"
              />
            </div>
            <div className="wm-field">
              <label>Image URL</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
                inputMode="url"
              />
            </div>
          </div>

          <div className="wm-field">
            <label>Mnemonic</label>
            <textarea
              value={form.mnemonic}
              onChange={(e) => setForm({ ...form, mnemonic: e.target.value })}
              placeholder="A memory hook for this word…"
              rows={3}
            />
          </div>

          <div className="wm-switches">
            <label className="wm-switch">
              <input
                type="checkbox"
                checked={!!form.modes?.flashcard}
                onChange={(e) =>
                  setForm({ ...form, modes: { ...(form.modes || {}), flashcard: e.target.checked } })
                }
              />
              <span>Use in Flashcards</span>
            </label>
            <label className="wm-switch">
              <input
                type="checkbox"
                checked={!!form.modes?.spelling}
                onChange={(e) =>
                  setForm({ ...form, modes: { ...(form.modes || {}), spelling: e.target.checked } })
                }
              />
              <span>Use in Spelling</span>
            </label>
          </div>
        </form>

        <footer className="wm-foot">
          {isEditing ? (
            <>
              <button className="wm-btn ghost" onClick={onCancelEdit} type="button">Cancel</button>
              <button className="wm-btn danger" onClick={() => delWord(editingId)} type="button">
                Delete
              </button>
              <button className="wm-btn primary" onClick={onSaveEdit} type="button">
                Save
              </button>
            </>
          ) : (
            <>
              <button className="wm-btn ghost" onClick={onClose} type="button">Cancel</button>
              <button className="wm-btn primary" onClick={handleSubmit} type="submit">
                Add
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}