'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'wages',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING(45)
      },
      grade_id: {
        type: Sequelize.INTEGER(11)
      },
      job_title_id: {
        type: Sequelize.INTEGER(11)
      },
      branch_id: {
        type: Sequelize.INTEGER(11)
      },
      minimum_nominal: {
        type: Sequelize.INTEGER(11)
      },
      maximum_nominal: {
        type: Sequelize.INTEGER(11)
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 1
      },
      created_by: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      updated_by: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.INTEGER
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
