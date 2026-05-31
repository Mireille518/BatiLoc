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
  const { numBat, adresse, montant, ville, quartier, latitude, longitude } = req.body;
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

  if (ville && typeof ville === 'string' && ville.trim().length > 60) {
    errors.push({ field: 'ville', message: 'Ville ne doit pas dépasser 60 caractères' });
  }

  if (quartier && typeof quartier === 'string' && quartier.trim().length > 60) {
    errors.push({ field: 'quartier', message: 'Quartier ne doit pas dépasser 60 caractères' });
  }

  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const latNumber = Number(latitude);
    if (isNaN(latNumber) || latNumber < -90 || latNumber > 90) {
      errors.push({ field: 'latitude', message: 'Latitude invalide' });
    }
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const longNumber = Number(longitude);
    if (isNaN(longNumber) || longNumber < -180 || longNumber > 180) {
      errors.push({ field: 'longitude', message: 'Longitude invalide' });
    }
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


