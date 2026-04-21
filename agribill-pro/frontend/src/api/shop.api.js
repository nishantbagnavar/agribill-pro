import api from './axios.js';

export const shopApi = {
  getProfile: () => api.get('/shop/profile'),
  updateProfile: (data) => api.put('/shop/profile', data),
  uploadLogo: (formData) => api.post('/shop/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};
