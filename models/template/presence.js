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
      device_id: {
        type: Sequelize.STRING(50)
      },
      code: {
        type: Sequelize.STRING(45)
      },
      date: {
        type: Sequelize.DATE
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
      description: {
        type: Sequelize.STRING(45)
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = absen, 1 = hadir, 2 = izin, 3 = cuti
        allowNull: false,
        defaultValue: 0
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
