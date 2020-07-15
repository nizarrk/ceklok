'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'schedule_switch',
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
      target_user_id: {
        type: Sequelize.INTEGER(11)
      },
      code: {
        type: Sequelize.STRING(45)
      },
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING(45)
      },
      notes: {
        type: Sequelize.STRING
      },
      date: {
        type: Sequelize.DATEONLY
      },
      target_user_date: {
        type: Sequelize.DATEONLY
      },
      target_user_status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
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
      approved_at: {
        type: Sequelize.DATE
      },
      approved_by: {
        type: Sequelize.INTEGER(10),
        defaultValue: 0,
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER(10),
        defaultValue: 0,
        allowNull: false
      },
      updated_by: {
        type: Sequelize.INTEGER(10),
        defaultValue: 0,
        allowNull: false
      }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
