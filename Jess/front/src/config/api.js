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
    const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
    
    // Pour les erreurs 403, inclure les détails si disponibles
    if (response.status === 403 && errorData.details) {
      const details = errorData.details;
      const errorMessage = `${errorData.message || 'Accès refusé'}\nRôle détecté: ${details.userPoste || 'non défini'}\nRôles autorisés: ${details.allowedRoles?.join(', ') || 'non défini'}`;
      throw new Error(errorMessage);
    }
    
    throw new Error(errorData.message || `Erreur ${response.status}`);
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
  CONVENTIONS_AVAILABLE_FOR_INVOICE: '/conventions/available-for-invoice',
  
  // Factures
  FACTURES: '/factures',
  FACTURE: (id) => `/factures/${id}`,
  FACTURES_STATS: '/factures/stats/summary',
  FACTURES_CHECK_STATUSES: '/factures/check-statuses',
  FACTURES_STATUS_CHANGES: '/factures/status-changes',
};

export default API_BASE_URL;


