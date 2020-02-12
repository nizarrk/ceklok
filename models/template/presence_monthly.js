'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'presence_monthly',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.INTEGER(11)
      },
      code: {
        type: Sequelize.STRING(45)
      },
      date: {
        type: Sequelize.DATEONLY
      },
      total_time: {
        type: Sequelize.STRING(50)
      },
      total_minus: {
        type: Sequelize.STRING(50)
      },
      total_over: {
        type: Sequelize.STRING(50)
      },
      total_present: {
        type: Sequelize.INTEGER(11)
      },
      total_absent: {
        type: Sequelize.INTEGER(11)
      },
      total_permission: {
        type: Sequelize.INTEGER(11)
      },
      total_cuti: {
        type: Sequelize.INTEGER(11)
      },
      total_day: {
        type: Sequelize.INTEGER(11)
      },
      description: {
        type: Sequelize.STRING(45)
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
