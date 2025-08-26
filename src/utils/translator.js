// src/utils/translator.js
// Returns native-script translations when possible.
// Primary: LibreTranslate (no transliteration);
// Fallback: MyMemory.
// Adds a simple “ASCII-only” check to avoid romanized results.

const NON_LATIN_TARGETS = new Set([
  'ru', 'uk', 'bg', 'sr', 'mk', 'el', 'ar', 'fa', 'he', 'hi', 'bn', 'ta', 'te', 'th', 'ka', 'hy', 'ko', 'ja', 'zh', 'zh-CN', 'zh-TW'
]);

function isAsciiOnly(s) {
  return /^[\x00-\x7F]*$/.test(s || '');
}

export async function autoTranslate(text, { from = 'en', to = 'ru' } = {}) {
  const q = String(text || '').trim();
  if (!q) return '';

  // 1) LibreTranslate (native script)
  try {
    const r = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, source: from, target: to, format: 'text' }),
    });
    if (r.ok) {
      const data = await r.json();
      const out = (data?.translatedText || '').trim();
      if (out && (!NON_LATIN_TARGETS.has(to) || !isAsciiOnly(out))) {
        return out;
      }
    }
  } catch {/* ignore and try fallback */ }

  // 2) MyMemory fallback
  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', q);
    url.searchParams.set('langpair', `${from}|${to}`);
    const r2 = await fetch(url.toString());
    if (r2.ok) {
      const d2 = await r2.json();
      const out = (d2?.responseData?.translatedText || '').trim();
      if (out && (!NON_LATIN_TARGETS.has(to) || !isAsciiOnly(out))) {
        return out;
      }
    }
  } catch {/* ignore */ }

  // If everything fails, just return the source so UI doesn’t break
  return q;
}