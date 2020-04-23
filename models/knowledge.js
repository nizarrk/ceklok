'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'knowledge',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      feature_id: {
        type: Sequelize.INTEGER(11)
      },
      subfeature_id: {
        type: Sequelize.INTEGER(11)
      },
      feature_type: {
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
      condition: {
        type: Sequelize.TEXT
      },
      analysis: {
        type: Sequelize.TEXT
      },
      solution: {
        type: Sequelize.TEXT
      },
      error_level: {
        type: Sequelize.INTEGER(1)
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
