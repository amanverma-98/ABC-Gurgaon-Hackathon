import { apiRequest, unwrapApiResponse } from './apiClient.js';

let cache = null;
let pending = null;
export async function getSupportedLanguages(force = false) {
  if (cache && !force) return cache;
  if (pending && !force) return pending;
  pending = apiRequest('/language/languages').then(unwrapApiResponse).then((data) => {
    cache = Array.isArray(data) ? data : (Array.isArray(data?.languages) ? data.languages : []);
    return cache;
  }).finally(() => { pending = null; });
  return pending;
}
export default { getSupportedLanguages };
