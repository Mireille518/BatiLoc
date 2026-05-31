'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mbatiment', 'ville', {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: 'adresse'
    });

    await queryInterface.addColumn('mbatiment', 'quartier', {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: 'ville'
    });

    await queryInterface.addColumn('mbatiment', 'latitude', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      after: 'quartier'
    });

    await queryInterface.addColumn('mbatiment', 'longitude', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      after: 'latitude'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('mbatiment', 'longitude');
    await queryInterface.removeColumn('mbatiment', 'latitude');
    await queryInterface.removeColumn('mbatiment', 'quartier');
    await queryInterface.removeColumn('mbatiment', 'ville');
  }
};

