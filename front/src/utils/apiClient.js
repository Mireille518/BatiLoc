// Client API avec gestion automatique du token
import { getAuthToken } from '../config/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  async request(endpoint, options = {}) {
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Si token expiré, rediriger vers login
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `Erreur ${response.status}` 
      }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  },
};

export default apiClient;


