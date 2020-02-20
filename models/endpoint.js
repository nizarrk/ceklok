'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'endpoint',
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
      feature_name: {
        type: Sequelize.STRING(50)
      },
      endpoint: {
        type: Sequelize.STRING(50)
      },
      method: {
        type: Sequelize.STRING(45)
      },
      directory: {
        type: Sequelize.STRING(45)
      },
      controller: {
        type: Sequelize.STRING(50)
      },
      function: {
        type: Sequelize.STRING(50)
      },
      activity: {
        type: Sequelize.STRING(50)
      },
      auth: {
        type: Sequelize.INTEGER(1)
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
