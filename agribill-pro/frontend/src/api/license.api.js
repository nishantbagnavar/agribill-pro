import api from './axios';

export const getLicenseStatus = () => api.get('/license/status').then(r => r.data.data);
export const activateLicense = (licenseKey) => api.post('/license/activate', { licenseKey }).then(r => r.data.data);
export const verifyLicense = () => api.post('/license/verify').then(r => r.data.data);
export const resetHwid = (licenseKey) => api.post('/license/reset-hwid', { licenseKey }).then(r => r.data.data);
export const getLanQr = () => api.get('/license/lan-qr').then(r => r.data.data);
