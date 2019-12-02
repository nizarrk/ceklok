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
      id_pricing: {
        type: Sequelize.INTEGER(11)
      },
      code_company: {
        type: Sequelize.STRING(45),
        unique: true
      },
      nama_company: {
        type: Sequelize.STRING(45)
      },
      alamat_company: {
        type: Sequelize.STRING(45)
      },
      telp_company: {
        type: Sequelize.STRING(45)
      },
      email_company: {
        type: Sequelize.STRING(45)
      },
      payment_status: {
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
