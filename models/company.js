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
        defaultValue: Sequelize.UUIDV4,
        unique: true
      },
      id_admin: {
        type: Sequelize.STRING(45)
      },
      nama: {
        type: Sequelize.STRING(45)
      },
      alamat: {
        type: Sequelize.STRING(45)
      },
      pricing: {
        type: Sequelize.INTEGER(11)
      },
      payment: {
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
