'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('convention', 'contact', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Contact du locataire pour cette convention'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('convention', 'contact');
  }
};

