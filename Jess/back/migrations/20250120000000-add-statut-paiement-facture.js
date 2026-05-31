'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter la colonne statutPaiement à la table facture
    await queryInterface.addColumn('facture', 'statutPaiement', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'codeCli' // Positionner après codeCli si possible
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer la colonne statutPaiement
    await queryInterface.removeColumn('facture', 'statutPaiement');
  }
};

