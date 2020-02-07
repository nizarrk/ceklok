'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'timezone',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      country_code: {
        type: Sequelize.STRING(5)
      },
      timezone: {
        type: Sequelize.STRING(125)
      },
      gmt_offset: {
        type: Sequelize.FLOAT(10, 2)
      },
      dst_offset: {
        type: Sequelize.FLOAT(10, 2)
      },
      raw_offset: {
        type: Sequelize.FLOAT(10, 2)
      }
      //   created_at: {
      //     allowNull: false,
      //     type: Sequelize.DATE,
      //     defaultValue: Sequelize.NOW
      //   },
      //   updated_at: {
      //     allowNull: false,
      //     type: Sequelize.DATE,
      //     defaultValue: Sequelize.NOW
      //   },
      //   action_by: {
      //     type: Sequelize.INTEGER(10),
      //     defaultValue: 0,
      //     allowNull: false
      //   },
      //   ip_address: {
      //     type: Sequelize.STRING(45),
      //     allowNull: false,
      //     defaultValue: '127.0.0.1'
      //   }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
