'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'presence_detail',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      presence_id: {
        type: Sequelize.INTEGER(11)
      },
      date: {
        type: Sequelize.DATEONLY
      },
      latitude_checkin: {
        type: Sequelize.FLOAT
      },
      longitude_checkin: {
        type: Sequelize.FLOAT
      },
      latitude_checkout: {
        type: Sequelize.FLOAT
      },
      longitude_checkout: {
        type: Sequelize.FLOAT
      },
      image_checkin_a: {
        type: Sequelize.STRING
      },
      image_checkin_b: {
        type: Sequelize.STRING
      },
      image_checkout_a: {
        type: Sequelize.STRING
      },
      image_checkout_b: {
        type: Sequelize.STRING
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
