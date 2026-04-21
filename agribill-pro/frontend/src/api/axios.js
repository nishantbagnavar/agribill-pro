import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30_000,
});

const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem('agribill-auth');
    if (stored) return JSON.parse(stored).state || {};
  } catch { /* ignore */ }
  return {};
};

api.interceptors.request.use((config) => {
  const { token } = getStoredAuth();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      const { refreshToken } = getStoredAuth();

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api.request(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          const newToken = data.data.accessToken;

          // Update stored token in Zustand persist store
          const stored = localStorage.getItem('agribill-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.state.token = newToken;
            localStorage.setItem('agribill-auth', JSON.stringify(parsed));
          }

          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('agribill-auth');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // No refresh token — force logout
      localStorage.removeItem('agribill-auth');
      window.location.href = '/login';
    } else if (err.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(err);
  }
);

export default api;
