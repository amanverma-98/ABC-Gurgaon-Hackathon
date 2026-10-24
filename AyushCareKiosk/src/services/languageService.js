import { kioskApi } from './api';

/** Backend-driven language catalog. Static UI translations remain local; interview
 * language capabilities come from the Node -> Python/Bhashini stack. */
export class LanguageService {
  constructor(apiClient = kioskApi) {
    this.api = apiClient;
    this.cache = null;
    this.promise = null;
  }

  async list({ force = false } = {}) {
    if (this.cache && !force) return this.cache;
    if (this.promise && !force) return this.promise;
    this.promise = this.api.languages()
      .then((result) => {
        const rawLanguages = Array.isArray(result) ? result : result?.languages;
        const languages = (Array.isArray(rawLanguages) ? rawLanguages : []).map((l) => ({
          ...l,
          name: l.name || l.name_en || l.code,
          native: l.native || l.name_native || l.name || l.name_en || l.code,
          name_en: l.name_en || l.name || l.code,
          name_native: l.name_native || l.native || l.name || l.name_en || l.code,
        }));
        this.cache = languages;
        return this.cache;
      })
      .finally(() => { this.promise = null; });
    return this.promise;
  }

  find(languages, code) {
    return (languages || []).find((item) => item.code === code) || null;
  }
}

export const languageService = new LanguageService();
export default languageService;
