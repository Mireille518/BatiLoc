const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('locataire', {
    codeCli: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nomcli: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    datenais: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    lieunais: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    pere: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    mere: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    cin: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    delivcin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    adressecli: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    activite: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'locataire',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "codeCli" },
        ]
      },
    ]
  });
};
