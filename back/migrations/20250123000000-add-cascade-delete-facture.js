'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Supprimer l'ancienne contrainte de clé étrangère
    await queryInterface.removeConstraint('facture', 'facture_ibfk_80');
    
    // Recréer la contrainte avec ON DELETE CASCADE
    await queryInterface.addConstraint('facture', {
      fields: ['numConv'],
      type: 'foreign key',
      name: 'facture_ibfk_80',
      references: {
        table: 'convention',
        field: 'numConv'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer la contrainte avec CASCADE
    await queryInterface.removeConstraint('facture', 'facture_ibfk_80');
    
    // Recréer l'ancienne contrainte sans CASCADE
    await queryInterface.addConstraint('facture', {
      fields: ['numConv'],
      type: 'foreign key',
      name: 'facture_ibfk_80',
      references: {
        table: 'convention',
        field: 'numConv'
      }
    });
  }
};

