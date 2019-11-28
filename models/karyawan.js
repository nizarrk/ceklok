'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'karyawan',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      id_karyawan: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        unique: true
      },
      code_company: {
        type: Sequelize.STRING(45)
      },
      nama: {
        type: Sequelize.STRING(45)
      },
      jenis_kelamin: {
        type: Sequelize.STRING(45)
      },
      umur: {
        type: Sequelize.STRING(45)
      },
      alamat: {
        type: Sequelize.STRING(45)
      },
      telp: {
        type: Sequelize.STRING(45)
      },
      email: {
        type: Sequelize.STRING(45)
      },
      username: {
        type: Sequelize.STRING(45)
      },
      password: {
        type: Sequelize.STRING(45)
      },
      role: {
        type: Sequelize.STRING(45)
      },
      grade: {
        type: Sequelize.STRING(45)
      },
      status: {
        type: Sequelize.STRING(45)
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
      }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
