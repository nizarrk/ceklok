'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'payment_type',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING
      },
      annual_price: {
        type: Sequelize.INTEGER(45)
      },
      monthly_price: {
        type: Sequelize.INTEGER(45)
      },
      annual_minimum: {
        type: Sequelize.INTEGER(45) // minimum beralangganan per tahun
      },
      monthly_minimum: {
        type: Sequelize.INTEGER(45) // minimum beralangganan per bulan
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 1
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
      },
      action_by: {
        type: Sequelize.INTEGER(10),
        defaultValue: 0,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
        defaultValue: '127.0.0.1'
      }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
