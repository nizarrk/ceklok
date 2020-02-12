'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'presence',
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
      schedule_id: {
        type: Sequelize.INTEGER(11)
      },
      check_in_device_id: {
        type: Sequelize.INTEGER(11)
      },
      check_out_device_id: {
        type: Sequelize.INTEGER(11)
      },
      check_in_branch_id: {
        type: Sequelize.INTEGER(11)
      },
      check_out_branch_id: {
        type: Sequelize.INTEGER(11)
      },
      code: {
        type: Sequelize.STRING(45)
      },
      date: {
        type: Sequelize.DATEONLY
      },
      check_in: {
        type: Sequelize.TIME
      },
      check_out: {
        type: Sequelize.TIME
      },
      total_time: {
        type: Sequelize.TIME
      },
      total_minus: {
        type: Sequelize.TIME
      },
      total_over: {
        type: Sequelize.TIME
      },
      description: {
        type: Sequelize.STRING(45)
      },
      presence_setting_id: {
        type: Sequelize.INTEGER(1), //HADIR (H) No Check-in  (NCI) Waiting Absence (WA) ABSEN (A) IZIN (I) CUTI (C)
        allowNull: false,
        defaultValue: 4 // 4 = WA
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
