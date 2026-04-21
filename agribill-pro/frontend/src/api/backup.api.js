import axios from './axios.js';

export const backupApi = {
  getStatus: () => axios.get('/api/backup/status'),
  createSnapshot: (label) => axios.post('/api/backup/snapshot', { label }),
  listSnapshots: () => axios.get('/api/backup/snapshots'),
  restoreSnapshot: (key) => axios.post('/api/backup/restore', { key }),
};
