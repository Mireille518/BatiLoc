// Gestion centralisée des erreurs frontend
export const handleApiError = (error, toast) => {
  console.error('API Error:', error);
  
  if (error.message.includes('Session expirée') || error.message.includes('401') || error.message.includes('403')) {
    toast.error('Session expirée. Veuillez vous reconnecter.');
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }, 2000);
    return;
  }

  if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
    toast.error('Erreur de connexion au serveur. Vérifiez votre connexion.');
    return;
  }

  toast.error(error.message || 'Une erreur est survenue');
};

export const formatError = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'Une erreur inattendue est survenue';
};


