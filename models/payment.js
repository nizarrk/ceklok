'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'payment',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      id_payment_method: {
        type: Sequelize.INTEGER(11)
      },
      id_company: {
        type: Sequelize.INTEGER(11)
      },
      nama_rek: {
        type: Sequelize.STRING(45)
      },
      no_rek: {
        type: Sequelize.STRING(45)
      },
      bukti: {
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
