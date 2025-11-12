/**
 * Middleware de validation des données
 */
const validateConvention = (req, res, next) => {
  const { numBat, adresse, montant, nomcli, datenais, lieunais, pere, mere, cin, delivcin, adressecli, activite } = req.body;
  const errors = [];

  // Validation bâtiment
  if (!numBat || isNaN(Number(numBat)) || Number(numBat) <= 0) {
    errors.push({ field: 'numBat', message: 'Numéro de bâtiment invalide' });
  }
  if (!adresse || typeof adresse !== 'string' || adresse.trim().length === 0) {
    errors.push({ field: 'adresse', message: 'Adresse requise' });
  }
  if (adresse && adresse.length > 20) {
    errors.push({ field: 'adresse', message: 'Adresse ne doit pas dépasser 20 caractères' });
  }
  if (montant === undefined || montant === null || isNaN(Number(montant)) || Number(montant) < 0) {
    errors.push({ field: 'montant', message: 'Montant invalide' });
  }

  // Validation locataire
  if (!nomcli || typeof nomcli !== 'string' || nomcli.trim().length === 0) {
    errors.push({ field: 'nomcli', message: 'Nom du locataire requis' });
  }
  if (!datenais) {
    errors.push({ field: 'datenais', message: 'Date de naissance requise' });
  }
  if (!lieunais || typeof lieunais !== 'string' || lieunais.trim().length === 0) {
    errors.push({ field: 'lieunais', message: 'Lieu de naissance requis' });
  }
  if (!pere || typeof pere !== 'string' || pere.trim().length === 0) {
    errors.push({ field: 'pere', message: 'Nom du père requis' });
  }
  if (!mere || typeof mere !== 'string' || mere.trim().length === 0) {
    errors.push({ field: 'mere', message: 'Nom de la mère requis' });
  }
  if (!cin || typeof cin !== 'string' || cin.trim().length === 0) {
    errors.push({ field: 'cin', message: 'CIN requis' });
  }
  if (!delivcin) {
    errors.push({ field: 'delivcin', message: 'Date de délivrance CIN requise' });
  }
  if (!adressecli || typeof adressecli !== 'string' || adressecli.trim().length === 0) {
    errors.push({ field: 'adressecli', message: 'Adresse du locataire requise' });
  }
  if (!activite || typeof activite !== 'string' || activite.trim().length === 0) {
    errors.push({ field: 'activite', message: 'Activité requise' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      message: 'Erreurs de validation',
      errors
    });
  }

  next();
};

const validateBatiment = (req, res, next) => {
  const { numBat, adresse, montant } = req.body;
  const errors = [];

  if (!numBat || isNaN(Number(numBat)) || Number(numBat) <= 0) {
    errors.push({ field: 'numBat', message: 'Numéro de bâtiment invalide' });
  }
  if (!adresse || typeof adresse !== 'string' || adresse.trim().length === 0) {
    errors.push({ field: 'adresse', message: 'Adresse requise' });
  }
  if (adresse && adresse.length > 20) {
    errors.push({ field: 'adresse', message: 'Adresse ne doit pas dépasser 20 caractères' });
  }
  if (montant === undefined || montant === null || isNaN(Number(montant)) || Number(montant) < 0) {
    errors.push({ field: 'montant', message: 'Montant invalide' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      message: 'Erreurs de validation',
      errors
    });
  }

  next();
};

module.exports = {
  validateConvention,
  validateBatiment
};


