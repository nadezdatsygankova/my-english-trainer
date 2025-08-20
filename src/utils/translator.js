// src/utils/translator.js
// Free, no-key translator via MyMemory API.
// NOTE: public service => occasional rate limits. We fail gracefully.

export async function autoTranslate(text, { from = "en", to = "ru" } = {}) {
  try {
    const q = encodeURIComponent(text.trim());
    if (!q) return "";
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${from}|${to}`;

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    // Primary suggestion
    let out = data?.responseData?.translatedText || "";
    // Sometimes there are better matches under matches[]
    if (data?.matches?.length) {
      const best = [...data.matches]
        .sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
      if (best?.translation && (best.quality || 0) >= 80) out = best.translation;
    }

    return (out || "").trim();
  } catch (e) {
    console.warn("[translator] fallback:", e);
    return ""; // never throw — just fallback to manual entry
  }
}