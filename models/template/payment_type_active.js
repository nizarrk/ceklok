'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'payment_type_active',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      payment_type_id: {
        type: Sequelize.INTEGER(11)
      },
      date_start: {
        type: Sequelize.DATEONLY
      },
      date_end: {
        type: Sequelize.DATEONLY
      },
      status: {
        type: Sequelize.INTEGER(1) //0 = non aktif, 1 = aktif
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