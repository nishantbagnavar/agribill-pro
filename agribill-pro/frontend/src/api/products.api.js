import api from './axios.js';

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.post(`/products/${id}/stock-adjust`, data),
  getLowStock: () => api.get('/products/low-stock'),
  getExpiring: () => api.get('/products/expiring'),
  createVariant: (productId, data) => api.post(`/products/${productId}/variants`, data),
  updateVariant: (variantId, data) => api.put(`/products/variants/${variantId}`, data),
  deleteVariant: (variantId) => api.delete(`/products/variants/${variantId}`),
  adjustVariantStock: (variantId, data) => api.post(`/products/variants/${variantId}/stock-adjust`, data),
};
