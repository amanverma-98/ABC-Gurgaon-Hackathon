import axios from 'axios';
import Cookies from 'js-cookie';
import { disconnectSocket } from './socket';

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:8001/api/v1';

// Ensure base URL has no trailing slashes
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Guard against multiple simultaneous 401 redirects
let isHandling401 = false;

// Request Interceptor: Attach Bearer token from Cookies, localStorage, or sessionStorage
apiClient.interceptors.request.use(
  (config) => {
    let token: string | null | undefined = null;

    if (typeof window !== 'undefined') {
      token =
        Cookies.get('accessToken') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken');
    } else {
      token = Cookies.get('accessToken');
    }

    if (token) {
      // Clean token string if stored with extra quotes
      const cleanToken = token.replace(/^"(.*)"$/, '$1');
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401s and execute clean logout / redirection without infinite loops
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const requestUrl = error.config?.url || '';

    // Ignore 401 during intentional login attempts to allow the form to display error messages
    const isLoginEndpoint = requestUrl.includes('/auth/login');

    if (status === 401 && !isLoginEndpoint) {
      if (!isHandling401) {
        isHandling401 = true;

        // 1. Clear Cookies
        Cookies.remove('accessToken', { path: '/' });
        Cookies.remove('userRole', { path: '/' });

        // 2. Clear Local and Session storage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            sessionStorage.clear();
          } catch {
            // Ignore storage errors
          }

          // 3. Disconnect active Socket
          try {
            disconnectSocket();
          } catch {
            // Ignore socket disconnect errors
          }

          // 4. Force clean redirect to /login if not already on an auth page
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/auth')) {
            window.location.replace('/login');
          }
        }

        setTimeout(() => {
          isHandling401 = false;
        }, 1500);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
