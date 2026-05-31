'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter les colonnes pour les périodes de paiement
    await queryInterface.addColumn('facture', 'dateDebut', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Date de début de la période couverte par le paiement'
    });
    
    await queryInterface.addColumn('facture', 'dateFin', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Date de fin de la période couverte par le paiement'
    });
    
    await queryInterface.addColumn('facture', 'datePaiement', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Date effective du paiement'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les colonnes
    await queryInterface.removeColumn('facture', 'dateDebut');
    await queryInterface.removeColumn('facture', 'dateFin');
    await queryInterface.removeColumn('facture', 'datePaiement');
  }
};

