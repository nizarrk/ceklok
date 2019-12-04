'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'invoice',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      payment_id: {
        type: Sequelize.STRING(45)
      },
      invoice: {
        type: Sequelize.STRING(45)
      },
      payment_status: {
        type: Sequelize.STRING(45)
      },
      price: {
        type: Sequelize.INTEGER(45)
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
