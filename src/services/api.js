import axios from 'axios';

// Node.js Backend Server URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchSystemStatus = async () => {
  try {
    const response = await apiClient.get('/status');
    return response.data;
  } catch (error) {
    console.error('API Error fetching system status:', error);
    throw error;
  }
};

export const setSystemMode = async (mode) => {
  try {
    const response = await apiClient.post('/mode', { mode });
    return response.data;
  } catch (error) {
    console.error('API Error setting system mode:', error);
    throw error;
  }
};

export const checkPythonHealth = async () => {
  try {
    const response = await axios.get('http://localhost:8000/', { timeout: 2000 });
    return response.data;
  } catch (error) {
    return null;
  }
};

export default apiClient;
