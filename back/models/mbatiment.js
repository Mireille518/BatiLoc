const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('mbatiment', {
    numBat: {
      autoIncrement: false,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    image: {
      type: DataTypes.BLOB('long'),
      allowNull: false
    },
    adresse: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    montant: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    statut: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'mbatiment',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "numBat" },
        ]
      },
    ]
  });
};
