'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'overtime',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      department_id: {
        type: Sequelize.INTEGER(11)
      },
      user_id: {
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
        type: Sequelize.TIME
      },
      notes: {
        type: Sequelize.STRING
      },
      result: {
        type: Sequelize.STRING
      },
      upload: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = pending, 1 = approved, 2 = rejected, 3 = finished
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
