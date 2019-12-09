'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'payment',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      payment_method_id: {
        type: Sequelize.INTEGER(11)
      },
      pricing_id: {
        type: Sequelize.INTEGER(11)
      },
      company_id: {
        type: Sequelize.INTEGER(11)
      },
      rek_name: {
        type: Sequelize.STRING(45)
      },
      rek_no: {
        type: Sequelize.STRING(45)
      },
      image: {
        type: Sequelize.STRING(45) // foto bukti pembayaran
      },
      total: {
        type: Sequelize.INTEGER(11)
      },
      status: {
        type: Sequelize.INTEGER(1) // 0 = open, 1 = close
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
