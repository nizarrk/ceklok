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
      company_id: {
        type: Sequelize.INTEGER(11)
      },
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING(45)
      },
      date: {
        type: Sequelize.DATEONLY
      },
      invoice: {
        type: Sequelize.STRING(45)
      },
      subscription_type: {
        type: Sequelize.INTEGER(11) // 0 = default, 1 = bulanan, 2 = tahunan, 3 = one time
      },
      subscription: {
        type: Sequelize.INTEGER(11)
      },
      from_bank_name: {
        type: Sequelize.STRING(45)
      },
      from_rek_name: {
        type: Sequelize.STRING(45)
      },
      from_rek_no: {
        type: Sequelize.STRING(45)
      },
      image: {
        type: Sequelize.STRING(45) // foto bukti pembayaran
      },
      image_admin: {
        type: Sequelize.STRING(45) // bukti pembayaran sudah masuk
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
