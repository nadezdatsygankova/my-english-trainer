// src/utils/ipa.js
// Tries the free dictionary API first, then falls back to a small embedded map.
// Caches results in localStorage.

const CACHE_KEY = 'ipa-cache-v1';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
}

// Minimal fallback for common words (add more as you like)
const FALLBACK_IPA = {
  hello: 'həˈləʊ',
  world: 'wɜːld',
  cold: 'kəʊld',
  liberty: 'ˈlɪbəti',
};

export async function getIPA(raw) {
  const word = String(raw || '').trim().toLowerCase();
  if (!word) return '';

  // cache
  const cache = loadCache();
  if (cache[word]) return cache[word];

  // 1) Try dictionaryapi.dev (free)
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (r.ok) {
      const data = await r.json();
      const ipa =
        data?.[0]?.phonetics?.find(p => p.text && /[ˈˌəɪʊɑɛɔθðʃʒ]/.test(p.text))?.text ||
        data?.[0]?.phonetics?.[0]?.text ||
        '';
      if (ipa) {
        cache[word] = ipa;
        saveCache(cache);
        return ipa;
      }
    }
  } catch {
    // ignore and fall back
  }

  // 2) Fallback map
  if (FALLBACK_IPA[word]) {
    cache[word] = FALLBACK_IPA[word];
    saveCache(cache);
    return FALLBACK_IPA[word];
  }

  return ''; // nothing found
}