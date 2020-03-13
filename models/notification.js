'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'notification',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      recipient_id: {
        type: Sequelize.INTEGER(11)
      },
      company_id: {
        type: Sequelize.INTEGER(11)
      },
      recipient_level: {
        type: Sequelize.INTEGER(11)
      },
      sender_level: {
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
      email: {
        type: Sequelize.STRING(50)
      },
      url: {
        type: Sequelize.STRING(50)
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 1
      },
      status_read: {
        type: Sequelize.INTEGER(1), //0 = belum read, 1 = sudah read
        allowNull: false,
        defaultValue: 0
      },
      notification_type: {
        type: Sequelize.INTEGER(11) // 1 = push, 2 = mail
      },
      notification_sub_type: {
        type: Sequelize.INTEGER(11)
      },
      broadcast_type: {
        type: Sequelize.INTEGER(11)
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
