'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter la colonne superficie à la table mbatiment
    await queryInterface.addColumn('mbatiment', 'superficie', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      comment: 'Superficie du terrain en mètres carrés'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer la colonne superficie
    await queryInterface.removeColumn('mbatiment', 'superficie');
  }
};

