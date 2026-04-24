import api from './axios.js';

export const billingApi = {
  getBills: (params) => api.get('/billing/bills', { params }),
  getBillById: (id) => api.get(`/billing/bills/${id}`),
  createBill: (data) => api.post('/billing/bills', data),
  updateBill: (id, data) => api.put(`/billing/bills/${id}`, data),
  recordPayment: (id, data) => api.post(`/billing/bills/${id}/payment`, data),
  downloadPdf: (id) => api.get(`/billing/bills/${id}/pdf`, { responseType: 'blob' }),
  downloadThermalPdf: (id) => api.get(`/billing/bills/${id}/thermal-pdf`, { responseType: 'blob' }),
  getNextBillNumber: () => api.get('/billing/next-bill-number'),
  getWhatsAppLink: (id) => api.get(`/billing/bills/${id}/whatsapp-link`),
};
