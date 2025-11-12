const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('utilisateur', {
    matricule: {

      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    contact: {
      type: DataTypes.STRING(13),
      allowNull: false,
      unique: "contact"
    },
    email: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: "email"
    },
    mdp: {
      type: DataTypes.STRING(225),
      allowNull: false
    },
    numConv: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'convention',
        key: 'numConv'
      }
    },
    poste: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'utilisateur',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "matricule" },
        ]
      },
      {
        name: "contact",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "contact" },
        ]
      },
      {
        name: "email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
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
