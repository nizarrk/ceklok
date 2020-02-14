'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'company',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      pricing_id: {
        type: Sequelize.INTEGER(11)
      },
      company_code: {
        type: Sequelize.STRING(45),
        unique: true
      },
      established_date: {
        type: Sequelize.DATEONLY
      },
      name: {
        type: Sequelize.STRING(45)
      },
      company_field: {
        type: Sequelize.STRING(50)
      },
      description: {
        type: Sequelize.STRING(255)
      },
      address: {
        type: Sequelize.STRING(45)
      },
      kelurahan: {
        type: Sequelize.STRING(45)
      },
      kecamatan: {
        type: Sequelize.STRING(45)
      },
      city: {
        type: Sequelize.STRING(45)
      },
      province: {
        type: Sequelize.STRING(45)
      },
      zipcode: {
        type: Sequelize.STRING(45)
      },
      msisdn: {
        type: Sequelize.STRING(45)
      },
      tlp: {
        type: Sequelize.STRING(45)
      },
      email: {
        type: Sequelize.STRING(45)
      },
      payment_status: {
        type: Sequelize.INTEGER(1), //0 = pending, 1 = paid
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = pendding, 1 = approve, 2 = reject, 3 = deleted
        allowNull: false,
        defaultValue: 0
      },
      status_upload: {
        type: Sequelize.STRING(100)
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
