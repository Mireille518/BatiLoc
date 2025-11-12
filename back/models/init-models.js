var DataTypes = require("sequelize").DataTypes;
var _convention = require("./convention");
var _facture = require("./facture");
var _locataire = require("./locataire");
var _mbatiment = require("./mbatiment");
var _utilisateur = require("./utilisateur");

function initModels(sequelize) {
  var convention = _convention(sequelize, DataTypes);
  var facture = _facture(sequelize, DataTypes);
  var locataire = _locataire(sequelize, DataTypes);
  var mbatiment = _mbatiment(sequelize, DataTypes);
  var utilisateur = _utilisateur(sequelize, DataTypes);

  facture.belongsTo(convention, { as: "numConv_convention", foreignKey: "numConv"});
  convention.hasMany(facture, { as: "factures", foreignKey: "numConv"});
  utilisateur.belongsTo(convention, { as: "numConv_convention", foreignKey: "numConv"});
  convention.hasMany(utilisateur, { as: "utilisateurs", foreignKey: "numConv"});
  convention.belongsTo(facture, { as: "numFact_facture", foreignKey: "numFact"});
  facture.hasMany(convention, { as: "conventions", foreignKey: "numFact"});
  convention.belongsTo(locataire, { as: "codeCli_locataire", foreignKey: "codeCli"});
  locataire.hasMany(convention, { as: "conventions", foreignKey: "codeCli"});
  facture.belongsTo(locataire, { as: "codeCli_locataire", foreignKey: "codeCli"});
  locataire.hasMany(facture, { as: "factures", foreignKey: "codeCli"});
  convention.belongsTo(mbatiment, { as: "numBat_mbatiment", foreignKey: "numBat"});
  mbatiment.hasMany(convention, { as: "conventions", foreignKey: "numBat"});
  facture.belongsTo(mbatiment, { as: "numBat_mbatiment", foreignKey: "numBat"});
  mbatiment.hasMany(facture, { as: "factures", foreignKey: "numBat"});

  return {
    convention,
    facture,
    locataire,
    mbatiment,
    utilisateur,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
