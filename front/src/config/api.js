// Configuration centralisée de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Fonction pour obtenir le token depuis localStorage
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Fonction pour faire des requêtes authentifiées
export const apiRequest = async (endpoint, options = {}) => {
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur serveur' }));
    throw new Error(error.message || `Erreur ${response.status}`);
  }

  return response.json();
};

// Endpoints
export const API_ENDPOINTS = {
  // User
  LOGIN: '/user/login',
  REGISTER: '/user/register',
  PROFILE: '/user/profile',
  USERS: '/user',
  
  // Bâtiments
  BATIMENTS: '/batiments',
  BATIMENT: (id) => `/batiments/${id}`,
  
  // Conventions
  CONVENTIONS: '/conventions',
  CONVENTION: (id) => `/conventions/${id}`,
  
  // Factures
  FACTURES: '/factures',
  FACTURE: (id) => `/factures/${id}`,
  FACTURES_STATS: '/factures/stats/summary',
};

export default API_BASE_URL;


