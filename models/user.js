'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'users',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      nama: {
        type: Sequelize.STRING(45)
      },
      email: {
        type: Sequelize.STRING(45)
      },
      username: {
        type: Sequelize.STRING(45)
      },
      telp: {
        type: Sequelize.STRING(45)
      },
      password: {
        type: Sequelize.STRING(45)
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
