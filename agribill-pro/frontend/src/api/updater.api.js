import api from './axios.js';

function getToken() {
  try {
    const stored = localStorage.getItem('agribill-auth');
    if (stored) return JSON.parse(stored).state?.token || '';
  } catch { /* ignore */ }
  return '';
}

export const updaterApi = {
  check: () => api.get('/updater/check').then((r) => r.data.data),

  // Returns an EventSource — SSE can't set headers, so token goes in query
  startDownload: () => {
    const token = getToken();
    return new EventSource(`/api/updater/download?token=${encodeURIComponent(token)}`);
  },

  apply: (sha256) => api.post('/updater/apply', { sha256 }).then((r) => r.data),
};
