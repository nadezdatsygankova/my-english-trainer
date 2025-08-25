// helpers & algorithms (shared)
export const todayISO = () => new Date().toISOString().split("T")[0];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Fisher-Yates shuffle to avoid the bias of Array.sort with Math.random
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
export const safeLower = (s) => (s || "").toString().toLowerCase();

export function levenshtein(a = "", b = "") {
  a = safeLower(a); b = safeLower(b);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const bt = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  for (let i = 0; i <= m; i++) { dp[i][0] = i; bt[i][0] = "del"; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; bt[0][j] = "ins"; }
  bt[0][0] = null;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    const sub = dp[i - 1][j - 1] + cost;
    const del = dp[i - 1][j] + 1;
    const ins = dp[i][j - 1] + 1;
    const best = Math.min(sub, del, ins);
    dp[i][j] = best;
    bt[i][j] = best === sub ? (cost === 0 ? "eq" : "sub") : best === del ? "del" : "ins";
  }
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

export function suggestMnemonic(word, translation) {
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