// src/pages/Words.jsx
import React, { useEffect, useMemo, useState } from "react";
import WordManagerModal from "../components/WordManagerModal";
import useIsMobile from "../utils/useIsMobile";
import { uid, todayISO, safeLower } from "../utils";

export default function Words() {
  const isMobile = useIsMobile(768);

  // data
  const [words, setWords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("words-v1") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("words-v1", JSON.stringify(words));
  }, [words]);

  // add/edit state (reuses your modal API)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    word: "", translation: "", category: "noun", difficulty: "easy",
    ipa: "", mnemonic: "", imageUrl: "", modes: { flashcard: true, spelling: true }
  });

  const startAdd = () => {
    setEditingId(null);
    setForm({
      word: "", translation: "", category: "noun", difficulty: "easy",
      ipa: "", mnemonic: "", imageUrl: "", modes: { flashcard: true, spelling: true }
    });
    setOpen(true);
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setForm({
      word: w.word || "", translation: w.translation || "", category: w.category || "noun",
      difficulty: w.difficulty || "easy", ipa: w.ipa || "", mnemonic: w.mnemonic || "",
      imageUrl: w.imageUrl || "", modes: w.modes ?? { flashcard: true, spelling: true }
    });
    setOpen(true);
  };

  const addWord = () => {
    const word = (form.word || "").trim();
    if (!word) return;
    const entry = {
      id: uid(),
      word,
      translation: (form.translation || "").trim(),
      category: form.category,
      difficulty: form.difficulty,
      ipa: form.ipa || "",
      mnemonic: form.mnemonic || "",
      imageUrl: form.imageUrl || "",
      modes: form.modes ?? { flashcard: true, spelling: true },
      interval: 0, ease: 2.5, reps: 0, lapses: 0,
      nextReview: todayISO(), createdAt: todayISO(),
      updated_at: new Date().toISOString(),
    };
    setWords((prev) => [entry, ...prev]);
    setOpen(false);
  };

  const onSaveEdit = () => {
    if (!editingId) return;
    setWords((prev) =>
      prev.map((w) => (w.id === editingId ? {
        ...w,
        word: form.word.trim(),
        translation: (form.translation || "").trim(),
        category: form.category, difficulty: form.difficulty,
        ipa: form.ipa || "", mnemonic: form.mnemonic || "", imageUrl: form.imageUrl || "",
        modes: form.modes ?? { flashcard: true, spelling: true },
        updated_at: new Date().toISOString(),
      } : w))
    );
    setEditingId(null);
    setOpen(false);
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setOpen(false);
  };

  const delWord = (id) => setWords((prev) => prev.filter((w) => w.id !== id));

  // filters + search
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [dif, setDif] = useState("all");

  const cats = useMemo(() => ["all", ...Array.from(new Set(words.map(w => w.category || "noun")))], [words]);
  const diffs = ["all", "easy", "medium", "hard"];

  const filtered = useMemo(() => {
    const qq = safeLower(q);
    return words.filter(w => {
      const matchText =
        !qq ||
        safeLower(w.word).includes(qq) ||
        safeLower(w.translation || "").includes(qq) ||
        safeLower(w.mnemonic || "").includes(qq);
      const matchCat = cat === "all" || (w.category || "noun") === cat;
      const matchDif = dif === "all" || (w.difficulty || "easy") === dif;
      return matchText && matchCat && matchDif;
    });
  }, [words, q, cat, dif]);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {/* Search + filters */}
      <div style={{
        border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff"
      }}>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search word, translation, mnemonic…"
            style={{
              border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, fontSize: 16
            }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, fontSize: 14 }}
            >
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={dif}
              onChange={(e) => setDif(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, fontSize: 14 }}
            >
              {diffs.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isMobile ? (
        // Cards on mobile
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(w => (
            <article key={w.id} style={{
              border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff",
              display: "grid", gap: 6
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 18 }}>
                  {w.word} {w.ipa && <span style={{ fontSize: 12, color: "#64748b" }}>({w.ipa})</span>}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {(w.category || "noun")} • {(w.difficulty || "easy")}
                </div>
              </div>
              {w.imageUrl && (
                <img src={w.imageUrl} alt={w.word}
                  style={{ width: "100%", height: "auto", borderRadius: 10, maxHeight: 160, objectFit: "cover" }} />
              )}
              {w.translation && (
                <div style={{ color: "#059669", fontWeight: 700 }}>{w.translation}</div>
              )}
              {w.mnemonic && (
                <div style={{ fontSize: 12, color: "#334155" }}>🧠 {w.mnemonic}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                <button
                  className="wm-btn"
                  onClick={() => startEdit(w)}
                  style={{ height: 44, borderRadius: 12 }}
                >
                  Edit
                </button>
                <button
                  className="wm-btn danger"
                  onClick={() => delWord(w.id)}
                  style={{ height: 44, borderRadius: 12 }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: "#6b7280", textAlign: "center", padding: 16 }}>
              No words match your filters.
            </div>
          )}
        </div>
      ) : (
        // Table on desktop
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={th}>Word</th>
                <th style={th}>Translation</th>
                <th style={th}>Cat</th>
                <th style={th}>Diff</th>
                <th style={th}>IPA</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={td}>{w.word}</td>
                  <td style={td}>{w.translation}</td>
                  <td style={td}>{w.category}</td>
                  <td style={td}>{w.difficulty}</td>
                  <td style={td}>{w.ipa}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button className="wm-btn" onClick={() => startEdit(w)} style={{ height: 36, marginRight: 8 }}>Edit</button>
                    <button className="wm-btn danger" onClick={() => delWord(w.id)} style={{ height: 36 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ color: "#6b7280", textAlign: "center", padding: 16 }}>
              No words match your filters.
            </div>
          )}
        </div>
      )}

      {/* Floating Add button (mobile) or top-right button (desktop) */}
      {isMobile ? (
        <button
          aria-label="Add word"
          onClick={startAdd} 
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 60,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#3b82f6",
            color: "#fff",
            border: 0,
            boxShadow: "0 10px 20px rgba(59,130,246,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            touchAction: "manipulation",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          {/* SVG plus icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      ) : (
        <div style={{ position: "sticky", bottom: 0, textAlign: "right" }}>
          <button className="wm-btn primary" onClick={startAdd} style={{ height: 40 }}>
            + Add word
          </button>
        </div>
      )}

      {/* Modal */}
      <WordManagerModal
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        words={words}
        addWord={addWord}
        delWord={delWord}
        editingId={editingId}
        onStartEdit={startEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
      />
    </section>
  );
}

const th = { padding: "10px 12px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#64748b" };
const td = { padding: "10px 12px", fontSize: 14, color: "#0f172a" };