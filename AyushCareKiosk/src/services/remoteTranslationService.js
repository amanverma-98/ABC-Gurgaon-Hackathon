import { kioskApi } from './api';

const cache = new Map();
const inflight = new Map();
const listeners = new Set();

const notify = () => listeners.forEach((fn) => { try { fn(); } catch {} });

export function subscribeTranslations(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCachedTranslation(text, language) {
  if (!text) return null;
  if (!language || language === 'en') return text;
  return cache.get(`${language}:${text}`) || null;
}

export function ensureTranslation(text, language) {
  const source = String(text || '').trim();
  const target = String(language || 'en').split('-')[0].toLowerCase();
  if (!source || target === 'en') return Promise.resolve(source);
  const key = `${target}:${source}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const promise = kioskApi.translate(source, 'en', target)
    .then((result) => {
      const translated = result?.text || result?.translated_text || result?.translation || result;
      if (typeof translated === 'string' && translated.trim()) {
        cache.set(key, translated.trim());
        notify();
        return translated.trim();
      }
      return source;
    })
    .catch(() => source)
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export const remoteTranslationService = { subscribeTranslations, getCachedTranslation, ensureTranslation };
export default remoteTranslationService;
