import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const CryptoService = {
  getAll: async () => {
    return api.get('/api/crypto'); 
  },

  getBasicDetails: async (symbol) => {
    return api.get(`/api/crypto/${symbol}`);
  },

  getSemanticDetails: async (symbol) => {
    return api.get(`/api/crypto/${symbol}/semantic`);
  }
};

export default api;