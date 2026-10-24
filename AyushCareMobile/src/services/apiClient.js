
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    if (envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return envUrl.replace(/localhost|127\.0\.0\.1/, window.location.hostname).replace(/\/$/, "");
    }
    if (!envUrl) {
      return `http://${window.location.hostname}:8001/api/v1`;
    }
  }
  return (envUrl || "http://localhost:8001/api/v1").replace(/\/$/, "");
}

const API_BASE_URL = getApiBaseUrl();

export async function apiRequest(path, options = {}) {
  const token = (() => {
    try { return localStorage.getItem("ayushcare_access_token"); } catch { return null; }
  })();

  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.detail ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function unwrapApiResponse(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

export { API_BASE_URL };
