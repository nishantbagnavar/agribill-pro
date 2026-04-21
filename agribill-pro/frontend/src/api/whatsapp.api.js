import api from './axios.js';

export const whatsappApi = {
  getStatus: () => api.get('/whatsapp/status'),
  sendBill: (data) => api.post('/whatsapp/send-bill', data),
  sendReminder: (data) => api.post('/whatsapp/send-reminder', data),
  bulkSend: (data) => api.post('/whatsapp/bulk-send', data),
  disconnect: () => api.post('/whatsapp/disconnect'),
};
