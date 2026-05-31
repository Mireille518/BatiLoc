const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('convention', {
    numConv: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lieu: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    dateConv: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    statutConv: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    numFact: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'facture',
        key: 'numFact'
      }
    },
    numBat: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mbatiment',
        key: 'numBat'
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
    contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Contact du locataire pour cette convention'
    }
  }, {
    sequelize,
    tableName: 'convention',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "numConv" },
        ]
      },
      {
        name: "statutConv",
        using: "BTREE",
        fields: [
          { name: "statutConv" },
        ]
      },
      {
        name: "numFact",
        using: "BTREE",
        fields: [
          { name: "numFact" },
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
    ]
  });
};
