/**
 * Middleware de gestion centralisée des erreurs
 */
const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      status: 400,
      message: 'Erreur de validation',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Erreur de contrainte unique
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: 409,
      message: 'Cette valeur existe déjà',
      field: err.errors[0]?.path
    });
  }

  // Erreur de clé étrangère
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      status: 400,
      message: 'Référence invalide'
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 401,
      message: 'Token invalide'
    });
  }

  // Erreur par défaut
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Une erreur est survenue' 
    : err.message;

  res.status(status).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
};

module.exports = errorHandler;


