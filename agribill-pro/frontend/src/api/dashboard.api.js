import api from './axios.js';

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getSalesChart: (params) => api.get('/dashboard/sales-chart', { params }),
  getTopProducts: () => api.get('/dashboard/top-products'),
  getCategoryBreakdown: () => api.get('/dashboard/category-breakdown'),
  getRecentBills: () => api.get('/dashboard/recent-bills'),
  getAlerts: () => api.get('/dashboard/alerts'),
};
