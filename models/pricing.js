'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'pricing',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING(50)
      },
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING(45)
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
      type: {
        type: Sequelize.INTEGER(1) // 0 = registration pricing, 1 = additional pricing
      },
      image: {
        type: Sequelize.STRING(255)
      },
      publication: {
        type: Sequelize.INTEGER(1), // 0 = unpublished, 1 = published,
        defaultValue: 1
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif,
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
