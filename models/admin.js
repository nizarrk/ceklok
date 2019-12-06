'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'admin',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      company_id: {
        type: Sequelize.INTEGER(11)
      },
      company_code: {
        type: Sequelize.STRING(45)
      },
      user_name: {
        type: Sequelize.STRING(45)
      },
      password: {
        type: Sequelize.STRING(45)
      },
      name: {
        type: Sequelize.STRING(45)
      },
      gender: {
        type: Sequelize.INTEGER(11) //1 = Male, 2 = Female, 3 = Other
      },
      pob: {
        type: Sequelize.STRING(45)
      },
      dob: {
        type: Sequelize.DATE
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
      status: {
        type: Sequelize.INTEGER(1), //0 = pendding, 1 = approve, 2 = reject, 3 = deleted
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