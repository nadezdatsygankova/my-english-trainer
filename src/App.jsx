import React, { useEffect, useMemo, useRef, useState } from "react";

/** App.jsx — English Learning App (Fluent Forever–inspired)
 * Core features: centered layout, flashcards (SRS), quiz, spelling trainer w/ per-letter hints,
 * add/manage words, import/export JSON, custom dropdowns, B2 pack loader, ear training, speak practice.
 * Extra: Picture-only recall, mnemonic suggestions, minimal pairs import/export (CSV/JSON), full starter pairs.
 */

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().split("T")[0];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const safeLower = (s) => (s || "").toString().toLowerCase();

// Levenshtein with backtrace (for per-letter hints)
function levenshtein(a = "", b = "") {
  a = safeLower(a); b = safeLower(b);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const bt = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  for (let i = 0; i <= m; i++) { dp[i][0] = i; bt[i][0] = "del"; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; bt[0][j] = "ins"; }
  bt[0][0] = null;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const sub = dp[i - 1][j - 1] + cost;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const best = Math.min(sub, del, ins);
      dp[i][j] = best;
      bt[i][j] = best === sub ? (cost === 0 ? "eq" : "sub") : best === del ? "del" : "ins";
    }
  }
  // backtrace
  let i = m, j = n; const tokens = [];
  while (i > 0 || j > 0) {
    const step = bt[i][j];
    if (step === "eq" || step === "sub") { tokens.push({ type: step === "eq" ? "eq" : "sub", a: a[i-1], b: b[j-1] }); i--; j--; }
    else if (step === "del") { tokens.push({ type: "del", a: a[i-1], b: "" }); i--; }
    else if (step === "ins") { tokens.push({ type: "ins", a: "", b: b[j-1] }); j--; }
    else break;
  }
  tokens.reverse();
  return { distance: dp[m][n], tokens };
}

// ---------- styles ----------
const styles = {
  viewport: { minHeight: "100dvh", width: "100%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#eef2ff,#ffffff)", padding: 24 },
  centerWrap: { width: "min(100%, 1024px)" },
  appCard: { width: "100%", background: "#ffffff", borderRadius: 20, boxShadow: "0 18px 60px rgba(2,6,23,.12)", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 20, borderBottom: "1px solid #e2e8f0" },
  title: { fontSize: 24, fontWeight: 800, color: "#0f172a" },
  body: { padding: 20 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" },
  card: { flex: "1 1 320px", background: "#fff", border: "1px solid #eef2f7", borderRadius: 16, boxShadow: "0 6px 24px rgba(15, 23, 42, .06)", padding: 20 },
  progressShell: { width: "100%", height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" },
  progressFill: (pct) => ({ height: "100%", width: pct + "%", background: "#6366f1", transition: "width .3s" }),
  h2: { fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 10, color: "#0f172a" },
  primary: { background: "#6366f1", color: "#fff", border: 0, padding: "10px 14px", borderRadius: 10, cursor: "pointer" },
  ghost: { background: "transparent", color: "#0f172a", border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 10, cursor: "pointer" },
  danger: { background: "#ef4444", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 8, cursor: "pointer" },
  input: { width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 10, outline: "none", background: "#fff", color: "#111827" },
  selectBtn: { width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", background: "#f9fafb", textAlign: "left", cursor: "pointer", color: "#111827" },
  listItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px dashed #e2e8f0" },
  // modal
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 },
  modal: { position: "relative", width: "min(760px, 100%)", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(2,6,23,.35)", padding: 20, zIndex: 60 },
  dropdown: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 10px 30px rgba(2,6,23,.15)", zIndex: 80, maxHeight: 220, overflowY: "auto" },
  dropdownItem: { padding: "10px 12px", cursor: "pointer", color: "#111827", background: "#fff" },
  dropdownItemActive: { padding: "10px 12px", cursor: "pointer", color: "#111827", background: "#eef2ff" },
  // badges
  badgeGood: { color: "#065f46", background: "#d1fae5", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  badgeClose: { color: "#92400e", background: "#fef3c7", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  badgeBad: { color: "#991b1b", background: "#fee2e2", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  // per-letter hints
  hintWrap: { marginTop: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", display: "flex", flexWrap: "wrap", gap: 4 },
  hintEq: { background: "#dcfce7", color: "#14532d", padding: "2px 4px", borderRadius: 4 },
  hintSub: { background: "#fee2e2", color: "#7f1d1d", padding: "2px 4px", borderRadius: 4 },
  hintDel: { background: "#e0e7ff", color: "#3730a3", padding: "2px 4px", borderRadius: 4 },
  hintIns: { background: "#fde68a", color: "#7c2d12", padding: "2px 4px", borderRadius: 4 },
  hintLegend: { display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12, color: "#475569" },
};

// ---------- Custom Select ----------
function Select({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      {label && <label style={{ display: "block", marginBottom: 6, color: "#111827" }}>{label}</label>}
      <button type="button" style={styles.selectBtn} onClick={() => setOpen((o) => !o)}>{value}</button>
      {open && (
        <div style={styles.dropdown} role="listbox">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <div key={opt} role="option" aria-selected={active} onClick={() => { onChange(opt); setOpen(false); }} style={active ? styles.dropdownItemActive : styles.dropdownItem}>{opt}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Master Minimal Pairs (broad starter set) ----------
const MASTER_MINIMAL_PAIRS = [
  // ɪ vs iː
  { a: "ship", b: "sheep", ipa: "/ʃɪp/ vs /ʃiːp/", focus: "ɪ vs iː" },
  { a: "bit", b: "beat", ipa: "/bɪt/ vs /biːt/", focus: "ɪ vs iː" },
  { a: "live", b: "leave", ipa: "/lɪv/ vs /liːv/", focus: "ɪ vs iː" },
  { a: "sit", b: "seat", ipa: "/sɪt/ vs /siːt/", focus: "ɪ vs iː" },
  { a: "fill", b: "feel", ipa: "/fɪl/ vs /fiːl/", focus: "ɪ vs iː" },
  { a: "rich", b: "reach", ipa: "/rɪtʃ/ vs /riːtʃ/", focus: "ɪ vs iː" },
  // ʊ vs uː
  { a: "full", b: "fool", ipa: "/fʊl/ vs /fuːl/", focus: "ʊ vs uː" },
  { a: "pull", b: "pool", ipa: "/pʊl/ vs /puːl/", focus: "ʊ vs uː" },
  { a: "could", b: "cooed", ipa: "/kʊd/ vs /kuːd/", focus: "ʊ vs uː" },
  // æ vs e
  { a: "bat", b: "bet", ipa: "/bæt/ vs /bɛt/", focus: "æ vs e" },
  { a: "pan", b: "pen", ipa: "/pæn/ vs /pɛn/", focus: "æ vs e" },
  { a: "bad", b: "bed", ipa: "/bæd/ vs /bɛd/", focus: "æ vs e" },
  // ʌ vs ɒ (or ʌ vs ɑ/ɔ depending dialect)
  { a: "cut", b: "cot", ipa: "/kʌt/ vs /kɒt/", focus: "ʌ vs ɒ" },
  { a: "luck", b: "lock", ipa: "/lʌk/ vs /lɒk/", focus: "ʌ vs ɒ" },
  { a: "cup", b: "cop", ipa: "/kʌp/ vs /kɒp/", focus: "ʌ vs ɒ" },
  // ɒ vs ɔː
  { a: "cot", b: "caught", ipa: "/kɒt/ vs /kɔːt/", focus: "ɒ vs ɔː" },
  { a: "collar", b: "caller", ipa: "/ˈkɒlə/ vs /ˈkɔːlə/", focus: "ɒ vs ɔː" },
  // ɑː vs ɜː
  { a: "heart", b: "hurt", ipa: "/hɑːt/ vs /hɜːt/", focus: "ɑː vs ɜː" },
  // r vs l
  { a: "rice", b: "lice", ipa: "/raɪs/ vs /laɪs/", focus: "r vs l" },
  { a: "right", b: "light", ipa: "/raɪt/ vs /laɪt/", focus: "r vs l" },
  { a: "road", b: "load", ipa: "/roʊd/ vs /loʊd/", focus: "r vs l" },
  // θ vs ð
  { a: "thin", b: "then", ipa: "/θɪn/ vs /ðɛn/", focus: "θ vs ð" },
  { a: "throw", b: "though", ipa: "/θroʊ/ vs /ðoʊ/", focus: "θ vs ð" },
  // θ vs s
  { a: "think", b: "sink", ipa: "/θɪŋk/ vs /sɪŋk/", focus: "θ vs s" },
  { a: "thin", b: "sin", ipa: "/θɪn/ vs /sɪn/", focus: "θ vs s" },
  // t vs θ
  { a: "tin", b: "thin", ipa: "/tɪn/ vs /θɪn/", focus: "t vs θ" },
  // f vs v
  { a: "fan", b: "van", ipa: "/fæn/ vs /væn/", focus: "f vs v" },
  { a: "fine", b: "vine", ipa: "/faɪn/ vs /vaɪn/", focus: "f vs v" },
  // s vs z
  { a: "seal", b: "zeal", ipa: "/siːl/ vs /ziːl/", focus: "s vs z" },
  { a: "sip", b: "zip", ipa: "/sɪp/ vs /zɪp/", focus: "s vs z" },
  { a: "price", b: "prize", ipa: "/praɪs/ vs /praɪz/", focus: "s vs z" },
  // k vs g
  { a: "coat", b: "goat", ipa: "/koʊt/ vs /goʊt/", focus: "k vs g" },
  { a: "cap", b: "gap", ipa: "/kæp/ vs /gæp/", focus: "k vs g" },
  { a: "back", b: "bag", ipa: "/bæk/ vs /bæg/", focus: "k vs g (final)" },
  // p vs b
  { a: "pat", b: "bat", ipa: "/pæt/ vs /bæt/", focus: "p vs b" },
  // t vs d
  { a: "ten", b: "den", ipa: "/tɛn/ vs /dɛn/", focus: "t vs d" },
  // ʃ vs s
  { a: "ship", b: "sip", ipa: "/ʃɪp/ vs /sɪp/", focus: "ʃ vs s" },
  // ʧ vs ʤ
  { a: "cheap", b: "jeep", ipa: "/tʃiːp/ vs /dʒiːp/", focus: "tʃ vs dʒ" },
  // ʃ vs ʒ
  { a: "pressure", b: "pleasure", ipa: "/ˈprɛʃə/ vs /ˈplɛʒə/", focus: "ʃ vs ʒ" },
  // n vs ŋ
  { a: "ban", b: "bang", ipa: "/bæn/ vs /bæŋ/", focus: "n vs ŋ" },
  // m vs n
  { a: "sum", b: "sun", ipa: "/sʌm/ vs /sʌn/", focus: "m vs n" },
  // æ vs e vs ɛ (extra)
  { a: "man", b: "men", ipa: "/mæn/ vs /mɛn/", focus: "æ vs e" },
];

// ---------- Built-in B2 pack (short preview; import supports full pack as JSON) ----------
const B2_PACK = [
  { word: "abolish", definition: "Formally put an end to a system or practice", partOfSpeech: "verb", example: "The government decided to abolish the outdated law." },
  { word: "abundant", definition: "Existing in large quantities; plentiful", partOfSpeech: "adjective", example: "The garden was abundant with colorful flowers." },
  { word: "adverse", definition: "Harmful or unfavorable", partOfSpeech: "adjective", example: "The policy had an adverse effect on the economy." },
  { word: "advocate", definition: "A person who supports or speaks in favor of something", partOfSpeech: "noun", example: "She is a strong advocate for environmental protection." },
  { word: "amend", definition: "Make changes to a text or law", partOfSpeech: "verb", example: "The constitution was amended to allow more voting rights." },
  { word: "comprehensive", definition: "Complete and including everything necessary", partOfSpeech: "adjective", example: "They conducted a comprehensive review of the policy." },
];

// ---------- mnemonic suggestion ----------
function suggestMnemonic(word, translation) {
  const w = safeLower(word);
  const t = translation || "";
  const emojiMap = {
    a: "🍎", b: "🐝", c: "🌊", d: "🐶", e: "🥚", f: "🎏", g: "🦍", h: "🏠", i: "🍦", j: "🧃",
    k: "🗝️", l: "🦁", m: "🌙", n: "🎶", o: "🟠", p: "🐧", q: "👑", r: "🚀", s: "🌟", t: "🌴",
    u: "☂️", v: "🎻", w: "🌊", x: "❌", y: "🧶", z: "⚡"
  };
  const e = emojiMap[w[0]] || "🧠";
  const hooks = [
    [/tion$/i, "📘 picture of 'action' → tion"],
    [/ight$/i, "💡 light → -ight"],
    [/ough$/i, "🕳️ rough/cough/dough family"],
    [/ph$/i, "📷 photo uses ph = f"],
  ];
  const hook = hooks.find(([re]) => re.test(word))?.[1] || "";
  return `${e} ${word} → ${t || "your meaning"}${hook ? " • " + hook : ""}`;
}

export default function App() {
  // ---------- state ----------
  const [progress, setProgress] = useState(() => { const s = localStorage.getItem("progress"); return s ? parseInt(s, 10) : 0; });
  const [words, setWords] = useState(() => {
    const s = localStorage.getItem("words-v1");
    if (s) return JSON.parse(s);
    return [
      { id: uid(), word: "cold", translation: "холодный", category: "adjective", difficulty: "easy", interval: 1, nextReview: todayISO(), createdAt: todayISO(), ipa: "/koʊld/", mnemonic: "Ice cube", imageUrl: "" },
      { id: uid(), word: "liberty", translation: "свобода", category: "noun", difficulty: "medium", interval: 1, nextReview: todayISO(), createdAt: todayISO(), ipa: "/ˈlɪbərti/", mnemonic: "Statue of Liberty", imageUrl: "" },
    ];
  });
  const [minimalPairs, setMinimalPairs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("minimalPairs") || "null") || MASTER_MINIMAL_PAIRS; } catch { return MASTER_MINIMAL_PAIRS; }
  });
  const [showManager, setShowManager] = useState(false);
  const [form, setForm] = useState({ word: "", translation: "", category: "noun", difficulty: "easy", ipa: "", mnemonic: "", imageUrl: "" });
  const [showAnswer, setShowAnswer] = useState(false);
  const [idx, setIdx] = useState(0);
  const [filterCat, setFilterCat] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [spellInput, setSpellInput] = useState("");
  const [spellMsg, setSpellMsg] = useState(null);
  const [hintTokens, setHintTokens] = useState([]);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetSounds, setTargetSounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("targetSounds") || JSON.stringify([...new Set(MASTER_MINIMAL_PAIRS.map(p => p.focus))])); } catch { return [...new Set(MASTER_MINIMAL_PAIRS.map(p => p.focus))]; }
  });
  const [enableSR, setEnableSR] = useState(() => localStorage.getItem("enableSR") === "1");
  const [pictureOnly, setPictureOnly] = useState(() => localStorage.getItem("pictureOnly") === "1");

  // Minimal pairs state
  const [mpIndex, setMpIndex] = useState(0);
  const [mpPlayed, setMpPlayed] = useState(null); // "a" or "b"
  const [mpMsg, setMpMsg] = useState(null);

  const categories = ["noun", "verb", "adjective", "adverb", "expression"];
  const difficulties = ["easy", "medium", "hard"];

  // ---------- derived ----------
  const dueList = useMemo(() => words.filter((w) => !w.nextReview || w.nextReview <= todayISO()), [words]);
  const filteredDue = useMemo(() => dueList.filter((w) => (filterCat === "all" || w.category === filterCat) && (filterDiff === "all" || w.difficulty === filterDiff)), [dueList, filterCat, filterDiff]);
  const current = filteredDue[idx] ?? null;

  const filteredPairs = useMemo(() => minimalPairs.filter(p => targetSounds.includes(p.focus)), [minimalPairs, targetSounds]);
  const currentPair = filteredPairs.length ? filteredPairs[mpIndex % filteredPairs.length] : null;

  // ---------- effects ----------
  useEffect(() => localStorage.setItem("words-v1", JSON.stringify(words)), [words]);
  useEffect(() => localStorage.setItem("minimalPairs", JSON.stringify(minimalPairs)), [minimalPairs]);
  useEffect(() => localStorage.setItem("progress", String(progress)), [progress]);
  useEffect(() => setIdx(0), [filterCat, filterDiff]);
  useEffect(() => localStorage.setItem("targetSounds", JSON.stringify(targetSounds)), [targetSounds]);
  useEffect(() => localStorage.setItem("enableSR", enableSR ? "1" : "0"), [enableSR]);
  useEffect(() => localStorage.setItem("pictureOnly", pictureOnly ? "1" : "0"), [pictureOnly]);

  // ---------- utils ----------
  const speak = (text) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } catch {} };

  // ---------- actions ----------
  const addWord = () => {
    if (!form.word.trim() || !form.translation.trim()) return;
    const entry = { id: uid(), word: form.word.trim(), translation: form.translation.trim(), category: form.category, difficulty: form.difficulty, interval: 1, nextReview: todayISO(), createdAt: todayISO(), ipa: form.ipa || "", mnemonic: form.mnemonic || "", imageUrl: form.imageUrl || "" };
    setWords((w) => [entry, ...w]);
    setForm({ word: "", translation: "", category: "noun", difficulty: "easy", ipa: "", mnemonic: "", imageUrl: "" });
  };
  const delWord = (id) => { setWords((w) => w.filter((x) => x.id !== id)); setIdx(0); };
  const grade = (correct) => {
    if (!current) return;
    setWords((prev) => prev.map((w) => {
      if (w.id !== current.id) return w;
      const nextInterval = correct ? clamp(w.interval * 2, 1, 30) : 1;
      const d = new Date(); d.setDate(d.getDate() + nextInterval);
      return { ...w, interval: nextInterval, nextReview: d.toISOString().split("T")[0] };
    }));
    if (correct) setProgress((p) => clamp(p + 5, 0, 100));
    setShowAnswer(false); setSpellInput(""); setSpellMsg(null); setHintTokens([]);
    setIdx((i) => (i + 1 < filteredDue.length ? i + 1 : 0));
  };

  // Import/Export words
  const exportJSON = () => { const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "words.json"; a.click(); URL.revokeObjectURL(url); };
  const onImportFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; const text = await file.text();
    try {
      const data = JSON.parse(text); if (!Array.isArray(data)) throw new Error("Not an array");
      if (data.length && data[0] && typeof data[0] === 'object' && 'a' in data[0] && 'b' in data[0]) {
        alert('Detected minimal pairs JSON. Use "Import Pairs" instead.');
        e.target.value = ""; return;
      }
      const normalized = data.map((item) =>
        typeof item === "string"
          ? { id: uid(), word: item, translation: "", category: "noun", difficulty: "easy", interval: 1, nextReview: todayISO(), createdAt: todayISO() }
          : { id: uid(), interval: 1, nextReview: todayISO(), createdAt: todayISO(), category: (item.partOfSpeech||"noun").toLowerCase(), difficulty: item.difficulty || "medium", translation: item.translation ?? item.definition ?? "", word: item.word ?? "", example: item.example ?? "", ipa: item.ipa || "", mnemonic: item.mnemonic || "", imageUrl: item.imageUrl || "" }
      );
      setWords((w) => [...normalized, ...w]);
      e.target.value = "";
    } catch { alert("Invalid JSON. Expect an array of words or objects."); }
  };

  // B2 pack
  const mapB2 = (it) => ({ id: uid(), word: it.word, translation: it.definition || "", category: (it.partOfSpeech||"expression").toLowerCase(), difficulty: "medium", interval: 1, nextReview: todayISO(), createdAt: todayISO(), example: it.example || "" });
  const loadB2Pack = () => {
    const existing = new Set(words.map(w => safeLower(w.word)));
    const newcomers = B2_PACK.filter(it => it.word && !existing.has(safeLower(it.word))).map(mapB2);
    if (newcomers.length === 0) { alert("B2 pack: no new words to add (all exist)."); return; }
    setWords(w => [...newcomers, ...w]);
    alert(`B2 pack loaded: added ${newcomers.length} words.`);
  };

  // Spelling check
  const checkSpelling = () => {
    if (!current) return;
    const target = safeLower(current.word).trim();
    const guess = safeLower(spellInput).trim();
    if (!guess) { setSpellMsg({ type: "bad", text: "Type your answer above." }); setHintTokens([]); return; }
    const { distance, tokens } = levenshtein(guess, target);
    setHintTokens(tokens);
    if (distance === 0) { setSpellMsg({ type: "good", text: "Perfect!" }); grade(true); }
    else if (distance <= 2) { setSpellMsg({ type: "close", text: `Almost! (${distance} letter off)` }); }
    else { setSpellMsg({ type: "bad", text: "Not quite. Check highlighted letters." }); }
  };

  // Speech Recognition
  const recRef = useRef(null);
  const srAvailable = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const startSR = () => {
    if (!srAvailable) { alert("Speech Recognition not available in this browser."); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const said = safeLower(e.results[0][0].transcript).trim();
      if (!current) return;
      const target = safeLower(current.word).trim();
      if (said === target) { alert("✅ Nice! Pronounced correctly"); grade(true); }
      else { alert(`Heard: "${said}" — target: "${target}"`); }
    };
    rec.onerror = () => { alert("SR error. Try again."); };
    rec.onend = () => { recRef.current = null; };
    recRef.current = rec; rec.start();
  };

  // Ear Training
  const playPair = () => {
    if (!currentPair) return;
    const which = Math.random() < 0.5 ? "a" : "b";
    setMpPlayed(which); setMpMsg(null);
    const text = which === "a" ? currentPair.a : currentPair.b;
    speak(text);
  };
  const guessPair = (choice) => {
    if (!mpPlayed) { setMpMsg({ type: "bad", text: "Press Play first." }); return; }
    const correct = choice === mpPlayed;
    setMpMsg({ type: correct ? "good" : "bad", text: correct ? "Correct!" : "Not this one." });
    if (correct) setMpIndex((i) => i + 1);
  };

  // Import/Export Minimal Pairs (CSV or JSON)
  const exportPairs = () => {
    const blob = new Blob([JSON.stringify(minimalPairs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'minimal_pairs.json'; a.click(); URL.revokeObjectURL(url);
  };
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const hasHeader = /a\s*,\s*b/i.test(lines[0]);
    const rows = hasHeader ? lines.slice(1) : lines;
    const out = [];
    for (const raw of rows) {
      const cells = []; let cur = ''; let inQ = false;
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      cells.push(cur.trim());
      const [a,b,ipa='',focus='custom'] = cells;
      if (a && b) out.push({ a, b, ipa, focus });
    }
    return out;
  }
  const onImportPairs = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; const text = await file.text();
    try {
      let cleaned = [];
      if (/\.csv$/i.test(file.name)) {
        cleaned = parseCSV(text);
      } else {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('not array');
        cleaned = data.filter(p => p && typeof p === 'object' && p.a && p.b).map(p => ({ a: String(p.a), b: String(p.b), ipa: p.ipa || '', focus: p.focus || 'custom' }));
      }
      if (!cleaned.length) { alert('No valid pairs found. Expect columns a,b,ipa?,focus?'); return; }
      setMinimalPairs(prev => [...prev, ...cleaned]);
      alert(`Imported ${cleaned.length} minimal pairs.`);
      e.target.value = '';
    } catch {
      alert('Invalid file. Provide CSV (a,b,ipa?,focus?) or JSON array of {a,b,ipa?,focus?}');
    }
  };
  const loadMasterPairs = () => {
    setMinimalPairs(MASTER_MINIMAL_PAIRS);
    setTargetSounds([...new Set(MASTER_MINIMAL_PAIRS.map(p => p.focus))]);
    alert(`Loaded ${MASTER_MINIMAL_PAIRS.length} minimal pairs.`);
  };

  // ---------- quiz ----------
  const quiz = useMemo(() => {
    if (!current) return null;
    const correct = `${current.word} = ${current.translation || "—"}`;
    const other = words.find((w) => w.id !== current.id)?.translation || "example";
    return { question: `Pick the correct translation for \"${current.word}\"`, options: shuffle([correct, `${current.word} = ${other}`]), answer: correct };
  }, [current, words]);

  // ---------- render ----------
  return (
    <div style={styles.viewport}>
      <div style={styles.centerWrap}>
        <div style={styles.appCard}>
          <header style={styles.header}>
            <div style={styles.title}>📘 Learn English — Daily Trainer</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.ghost} onClick={exportJSON}>Export JSON</button>
              <label style={styles.primary}>
                Import JSON
                <input onChange={onImportFile} type="file" accept="application/json" style={{ display: "none" }} />
              </label>
              <button style={styles.primary} onClick={() => setShowManager(true)}>＋ Add words</button>
              <button style={styles.ghost} onClick={loadB2Pack}>Load B2 Pack</button>
              <button style={styles.ghost} onClick={() => setSettingsOpen(true)}>Settings</button>
              <button style={styles.ghost} onClick={exportPairs}>Export Pairs</button>
              <label style={styles.ghost}>
                Import Pairs (CSV/JSON)
                <input onChange={onImportPairs} type="file" accept=".csv,application/json" style={{ display: 'none' }} />
              </label>
              <button style={styles.ghost} onClick={loadMasterPairs}>Load Full Minimal Pairs</button>
            </div>
          </header>

          <main style={styles.body}>
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.h2}>Progress</div>
              <div style={styles.progressShell}><div style={styles.progressFill(progress)} /></div>
              <div style={{ fontSize: 12, color: "#475569" }}>{progress}% complete • {filteredDue.length} due (filtered) / {words.length} total</div>
            </div>

            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.h2}>Filters</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select label="Category" value={filterCat === "all" ? "All" : filterCat.charAt(0).toUpperCase() + filterCat.slice(1)} options={["All","Noun","Verb","Adjective","Adverb","Expression"]} onChange={(val) => setFilterCat(val.toLowerCase())} />
                <Select label="Difficulty" value={filterDiff === "all" ? "All" : filterDiff.charAt(0).toUpperCase() + filterDiff.slice(1)} options={["All","Easy","Medium","Hard"]} onChange={(val) => setFilterDiff(val.toLowerCase())} />
              </div>
            </div>

            <div style={styles.row}>
              {/* Flashcards */}
              <section style={styles.card}>
                <div style={styles.h2}>Flashcards</div>
                {!current ? (
                  <div style={{ color: "#64748b" }}>🎉 No cards due with current filters.</div>
                ) : (
                  <div>
                    {/* Picture-only mode */}
                    {pictureOnly && current.imageUrl ? (
                      <div>
                        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                          <img alt={current.word} src={current.imageUrl} style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                          {!showAnswer && (
                            <button style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.35)', color: '#fff', fontWeight: 700, border: 0, cursor: 'pointer' }} onClick={() => setShowAnswer(true)}>Tap to reveal</button>
                          )}
                        </div>
                        {showAnswer && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{current.word} {current.ipa && <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>}</div>
                            <div style={{ fontSize: 18, color: "#059669", fontWeight: 700 }}>{current.translation || "—"}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{current.word} {current.ipa && <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>}</div>
                        <div style={{ fontSize: 13, color: "#475569" }}>{current.category} • {current.difficulty}</div>
                        {current.imageUrl && <img alt={current.word} src={current.imageUrl} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 12, marginTop: 8 }} />}
                        {current.mnemonic && <div style={{ marginTop: 6, fontSize: 12, color: "#334155" }}>🧠 {current.mnemonic}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button style={styles.ghost} onClick={() => speak(current.word)}>🔊 Speak</button>
                          {!showAnswer && <button style={styles.primary} onClick={() => setShowAnswer(true)}>Show answer</button>}
                        </div>
                        {showAnswer && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 18, color: "#059669", fontWeight: 700 }}>{current.translation || "—"}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button style={styles.primary} onClick={() => grade(true)}>✅ I was right</button>
                              <button style={styles.ghost} onClick={() => grade(false)}>❌ I was wrong</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>Interval: {current.interval} day(s)</div>
                  </div>
                )}
              </section>

              {/* Spelling Trainer */}
              <section style={styles.card}>
                <div style={styles.h2}>Spelling Trainer</div>
                {!current ? (
                  <div style={{ color: "#64748b" }}>Add some words to practice spelling.</div>
                ) : (
                  <div>
                    <div style={{ color: "#475569", marginBottom: 8 }}>Type the English word for:</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{current.translation || "—"}</div>
                    <input style={styles.input} placeholder="Type the English spelling" value={spellInput} onChange={(e) => setSpellInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkSpelling(); }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={styles.primary} onClick={checkSpelling}>Check</button>
                      <button style={styles.ghost} onClick={() => { setSpellInput(""); setSpellMsg(null); setHintTokens([]); }}>Clear</button>
                    </div>
                    {spellMsg && (
                      <div style={{ marginTop: 10 }}>
                        {spellMsg.type === "good" && <span style={styles.badgeGood}>{spellMsg.text}</span>}
                        {spellMsg.type === "close" && <span style={styles.badgeClose}>{spellMsg.text}</span>}
                        {spellMsg.type === "bad" && <span style={styles.badgeBad}>{spellMsg.text}</span>}
                      </div>
                    )}
                    {hintTokens.length > 0 && (
                      <div>
                        <div style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>Hint (your input vs target):</div>
                        <div style={styles.hintWrap}>
                          {hintTokens.map((t, i) => {
                            const base = t.type === 'eq' ? styles.hintEq : t.type === 'sub' ? styles.hintSub : t.type === 'del' ? styles.hintDel : styles.hintIns;
                            const text = t.type === 'ins' ? t.b : t.a || t.b;
                            return <span key={i} style={base}>{text || '•'}</span>;
                          })}
                        </div>
                        <div style={styles.hintLegend}>
                          <span><span style={styles.hintEq}>a</span> correct</span>
                          <span><span style={styles.hintSub}>a→b</span> wrong letter</span>
                          <span><span style={styles.hintDel}>a</span> extra in your input</span>
                          <span><span style={styles.hintIns}>b</span> missing letter</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Ear Training + Speak Practice */}
            <div style={styles.row}>
              {/* Ear Training (Minimal Pairs) */}
              <section style={styles.card}>
                <div style={styles.h2}>Ear Training (Minimal Pairs)</div>
                {!currentPair ? (
                  <div style={{ color: "#64748b" }}>Add target sounds in Settings or import pairs to begin.</div>
                ) : (
                  <div>
                    <div style={{ color: "#475569", marginBottom: 6 }}>Focus: {currentPair.focus} <span style={{ color: "#94a3b8" }}> {currentPair.ipa}</span></div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button style={styles.primary} onClick={playPair}>▶ Play</button>
                      <button style={styles.ghost} onClick={() => speak(currentPair.a)}>{currentPair.a}</button>
                      <button style={styles.ghost} onClick={() => speak(currentPair.b)}>{currentPair.b}</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={styles.ghost} onClick={() => guessPair("a")}>I heard: {currentPair.a}</button>
                      <button style={styles.ghost} onClick={() => guessPair("b")}>I heard: {currentPair.b}</button>
                    </div>
                    {mpMsg && (
                      <div style={{ marginTop: 8 }}>
                        {mpMsg.type === "good" && <span style={styles.badgeGood}>{mpMsg.text}</span>}
                        {mpMsg.type === "bad" && <span style={styles.badgeBad}>{mpMsg.text}</span>}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Speak Practice */}
              <section style={styles.card}>
                <div style={styles.h2}>Speak Practice</div>
                {!current ? (
                  <div style={{ color: "#64748b" }}>No card selected.</div>
                ) : (
                  <div>
                    <div style={{ color: "#475569", marginBottom: 8 }}>Say the word:</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{current.word} {current.ipa && <span style={{ fontSize: 14, color: "#64748b" }}>({current.ipa})</span>}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.ghost} onClick={() => speak(current.word)}>🔊 Model</button>
                      {enableSR ? (
                        <button style={styles.primary} onClick={startSR}>🎙️ Start recognition</button>
                      ) : (
                        <button style={styles.primary} onClick={() => alert('Enable Speech Recognition in Settings (Chrome recommended).')}>🎙️ Enable SR</button>
                      )}
                      <button style={styles.ghost} onClick={() => grade(true)}>✅ I nailed it</button>
                      <button style={styles.ghost} onClick={() => grade(false)}>❌ Need work</button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Add/Manage Words Modal */}
      {showManager && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal} role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...styles.h2, margin: 0 }}>Add / Manage Words</div>
              <button style={styles.ghost} onClick={() => setShowManager(false)}>✕ Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ color: "#111827" }}>Word</label>
                <input style={styles.input} value={form.word} onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#111827" }}>Meaning / Translation</label>
                <input style={styles.input} value={form.translation} onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#111827" }}>IPA (optional)</label>
                <input style={styles.input} placeholder="/ˈsæmpl/" value={form.ipa} onChange={(e) => setForm((f) => ({ ...f, ipa: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#111827" }}>Mnemonic (optional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...styles.input, flex: 1 }} placeholder="Your personal image/story" value={form.mnemonic} onChange={(e) => setForm((f) => ({ ...f, mnemonic: e.target.value }))} />
                  <button style={styles.ghost} onClick={() => setForm((f) => ({ ...f, mnemonic: suggestMnemonic(f.word, f.translation) }))}>Suggest</button>
                </div>
              </div>
              <div>
                <label style={{ color: "#111827" }}>Image URL (optional)</label>
                <input style={styles.input} placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
              </div>
              <div>
                <Select label="Category" value={form.category.charAt(0).toUpperCase() + form.category.slice(1)} options={["Noun","Verb","Adjective","Adverb","Expression"]} onChange={(val) => setForm((f) => ({ ...f, category: val.toLowerCase() }))} />
              </div>
              <div>
                <Select label="Difficulty" value={form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)} options={["Easy","Medium","Hard"]} onChange={(val) => setForm((f) => ({ ...f, difficulty: val.toLowerCase() }))} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.primary} onClick={addWord}>＋ Add word</button>
              <button style={styles.ghost} onClick={() => setForm({ word: "", translation: "", category: "noun", difficulty: "easy", ipa: "", mnemonic: "", imageUrl: "" })}>Reset</button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>My Words</div>
              <div>
                {words.length === 0 && <div style={{ color: "#64748b" }}>No words yet.</div>}
                {words.map((w) => (
                  <div key={w.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{w.word} {w.ipa && <span style={{ fontSize: 12, color: "#64748b" }}>({w.ipa})</span>}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{w.translation || "—"} • {w.category} • {w.difficulty}</div>
                      {w.mnemonic && <div style={{ fontSize: 12, color: "#334155" }}>🧠 {w.mnemonic}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={styles.ghost} onClick={() => speak(w.word)}>🔊</button>
                      <button style={styles.danger} onClick={() => delWord(w.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings (target sounds, speech recognition, picture-only) */}
      {settingsOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal} role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...styles.h2, margin: 0 }}>Settings</div>
              <button style={styles.ghost} onClick={() => setSettingsOpen(false)}>✕ Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Target sounds (Ear Training)</div>
                {[...new Set(minimalPairs.map(p => p.focus))].map((s) => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <input type="checkbox" checked={targetSounds.includes(s)} onChange={(e) => {
                      setTargetSounds((prev) => e.target.checked ? [...new Set([...prev, s])] : prev.filter(x => x !== s));
                    }} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>General</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input type="checkbox" checked={enableSR} onChange={(e) => setEnableSR(e.target.checked)} /> Enable Speech Recognition (Chrome recommended)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={pictureOnly} onChange={(e) => setPictureOnly(e.target.checked)} /> Picture-only flashcard recall (if image exists)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
 <footer style={styles.footer}>
    <div class="container">
      <div class="footer-content">
        <p>&copy;2025 <a href="https://www.nadiatsy.com/" target="_blank" aria-label="Portfolio"> Nadia Tsygankova.</a> Made with ❤️ and lots of ☕</p>
        <div class="footer-social">

          <a href="mailto:tsygankovanadia@gmail.com" target="_blank" aria-label="Email">
            <img src="/img/icons/email.svg" alt="Email" />
          </a>
          <a href="https://www.linkedin.com/in/nadezdatsygankova/" target="_blank" aria-label="LinkedIn">
            <img src="/img/icons/linkedin.svg" alt="LinkedIn" />
          </a>
          <a href="https://github.com/nadezdatsygankova" target="_blank" aria-label="GitHub">
            <img src="/img/icons/github.svg" alt="GitHub" />
          </a>
        </div>
      </div>
    </div>
  </footer>
    </div>

  );
}
