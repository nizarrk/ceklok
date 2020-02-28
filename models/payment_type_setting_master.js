'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'payment_type_setting_master',
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
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING(45)
      },
      type: {
        type: Sequelize.INTEGER(1)
      },
      html: {
        type: Sequelize.STRING
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
