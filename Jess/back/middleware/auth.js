const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY || process.env.secret_key || 'your_secret_key_change_me';

/**
 * Middleware d'authentification JWT
 * Vérifie que l'utilisateur est authentifié via un token valide
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'Token d\'authentification manquant. Veuillez vous connecter.'
    });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: 403,
        message: 'Token invalide ou expiré. Veuillez vous reconnecter.'
      });
    }

    // Ajouter les infos utilisateur à la requête
    req.user = decoded;
    
    // Log de débogage pour voir ce qui est décodé
    console.log('🔑 Token décodé:', {
      matricule: decoded.matricule,
      poste: decoded.poste,
      nom: decoded.nom
    });
    
    next();
  });
};

/**
 * Middleware de vérification de rôle
 * Vérifie que l'utilisateur a le bon rôle pour accéder à la route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        message: 'Authentification requise'
      });
    }

    // Normaliser le rôle de l'utilisateur (enlever espaces, convertir en minuscule)
    const userRole = (req.user.poste || '').trim().toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.trim().toLowerCase());

    // Log de débogage (toujours afficher pour déboguer les problèmes de permissions)
    console.log('🔐 Vérification de rôle:', {
      userRole,
      allowedRoles: normalizedAllowedRoles,
      userPoste: req.user.poste,
      userMatricule: req.user.matricule,
      match: normalizedAllowedRoles.includes(userRole)
    });

    if (!normalizedAllowedRoles.includes(userRole)) {
      console.error('❌ Accès refusé - Rôle non autorisé:', {
        userRole,
        allowedRoles: normalizedAllowedRoles,
        userPoste: req.user.poste,
        userMatricule: req.user.matricule
      });
      return res.status(403).json({
        status: 403,
        message: 'Accès refusé. Permissions insuffisantes.',
        details: {
          userRole,
          allowedRoles: normalizedAllowedRoles,
          userPoste: req.user.poste
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};


