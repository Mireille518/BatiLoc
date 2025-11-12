'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  up:(queryInterface, Sequelize)=>{

    return queryInterface.createTable('user_table',)
  }
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
