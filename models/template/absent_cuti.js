'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'absent_cuti',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      absent_cuti_type_id: {
        type: Sequelize.INTEGER(11)
      },
      absent_cuti_type_code: {
        type: Sequelize.INTEGER(255)
      },
      user_id: {
        type: Sequelize.INTEGER(11)
      },
      code: {
        type: Sequelize.STRING(45)
      },
      type: {
        type: Sequelize.INTEGER(1) // 0 = absen, 1 = cuti
      },
      description: {
        type: Sequelize.STRING(45)
      },
      date_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      date_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      time_start: {
        type: Sequelize.TIME
      },
      time_end: {
        type: Sequelize.TIME
      },
      time_total: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 0
      },
      count: {
        type: Sequelize.INTEGER(11)
      },
      upload: {
        type: Sequelize.STRING(45)
      },
      notes: {
        type: Sequelize.STRING
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
