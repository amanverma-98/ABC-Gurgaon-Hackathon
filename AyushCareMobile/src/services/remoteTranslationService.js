const cache = new Map();
const inflight = new Map();
const listeners = new Set();

const notify = () => listeners.forEach((fn) => { try { fn(); } catch {} });
const keyOf = (text, language) => `${language}:${text}`;

export function subscribeTranslations(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getCachedTranslation(text, language) { return cache.get(keyOf(text, language)) || null; }
export function ensureTranslation(text, language, apiRequest) {
  const source = String(text || '').trim();
  const target = String(language || 'en').split('-')[0].toLowerCase();
  if (!source || target === 'en') return Promise.resolve(source);
  const key = keyOf(source, target);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);
  const promise = apiRequest('/language/translate', {
    method: 'POST',
    body: JSON.stringify({ text: source, source_language: 'en', target_language: target }),
  }).then((payload) => {
    const data = payload?.data ?? payload;
    const translated = data?.text || data?.translated_text || data?.translation;
    if (typeof translated === 'string' && translated.trim()) {
      cache.set(key, translated.trim());
      notify();
      return translated.trim();
    }
    return source;
  }).catch(() => source).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
