'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'schedule',
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
      name: {
        type: Sequelize.STRING(45)
      },
      description: {
        type: Sequelize.STRING(45)
      },
      check_in_start: {
        type: Sequelize.TIME
      },
      check_in_end: {
        type: Sequelize.TIME
      },
      check_out_start: {
        type: Sequelize.TIME
      },
      check_out_end: {
        type: Sequelize.TIME
      },
      work_time: {
        type: Sequelize.TIME
      },
      break_time: {
        type: Sequelize.TIME
      },
      weekly_work_time: {
        type: Sequelize.STRING(45)
      },
      work_day: {
        type: Sequelize.STRING(45),
        get: function() {
          if (this.getDataValue('work_day').toString().length === 1) {
            let data = this.getDataValue('work_day');
            return [data];
          } else {
            let data = this.getDataValue('work_day').split(',');
            let hasil = [];

            data.map(x => {
              let num = parseInt(x);
              hasil.push(num);
            });

            return hasil;
          }
        }
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
        allowNull: false,
        defaultValue: 1
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
