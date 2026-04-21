import axios from './axios.js';

export const printerApi = {
  getConfig: () => axios.get('/api/printer/config'),
  saveConfig: (config) => axios.post('/api/printer/config', config),
  clearConfig: () => axios.delete('/api/printer/config'),
  discover: () => axios.get('/api/printer/discover'),
  getOsPrinters: () => axios.get('/api/printer/os-printers'),
  testPrint: (config) => axios.post('/api/printer/test', { config }),
  printBill: (billId) => axios.post(`/api/printer/print/${billId}`),
};
