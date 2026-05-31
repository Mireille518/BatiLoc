const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('facture', {
    numFact: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    dm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "dm"
    },
    exercice: {
      type: DataTypes.DATE,
      allowNull: false
    },
    mois: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    codegare: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    depart: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    destination: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    libelles: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    numBat: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mbatiment',
        key: 'numBat'
      }
    },
    numConv: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'convention',
        key: 'numConv'
      }
    },
    codeCli: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locataire',
        key: 'codeCli'
      }
    },
    statutPaiement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
    // Les colonnes dateDebut, dateFin et datePaiement sont commentées car elles n'existent pas encore dans la DB
    // Décommentez-les après avoir exécuté la migration 20250122000000-add-periodes-facture.js
    // dateDebut: {
    //   type: DataTypes.DATEONLY,
    //   allowNull: true,
    //   comment: 'Date de début de la période couverte par le paiement'
    // },
    // dateFin: {
    //   type: DataTypes.DATEONLY,
    //   allowNull: true,
    //   comment: 'Date de fin de la période couverte par le paiement'
    // },
    // datePaiement: {
    //   type: DataTypes.DATEONLY,
    //   allowNull: true,
    //   comment: 'Date effective du paiement'
    // }
  }, {
    sequelize,
    tableName: 'facture',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "numFact" },
        ]
      },
      {
        name: "dm",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "dm" },
        ]
      },
      {
        name: "numBat",
        using: "BTREE",
        fields: [
          { name: "numBat" },
        ]
      },
      {
        name: "codeCli",
        using: "BTREE",
        fields: [
          { name: "codeCli" },
        ]
      },
      {
        name: "numConv",
        using: "BTREE",
        fields: [
          { name: "numConv" },
        ]
      },
    ]
  });
};
