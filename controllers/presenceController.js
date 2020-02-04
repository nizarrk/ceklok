'use strict';

const async = require('async');
const moment = require('moment');

exports.generateDailyPresence = (APP, req, callback) => {
  async.waterfall(
    [
      function getEmployeeData(callback) {
        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              status: 1
            }
          })
          .then(res => {
            if (res.length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Data pegawai tidak ditemukan!'
              });
            }

            callback(null, res);
          });
      },

      function createPresence(result, callback) {
        let arr = [];

        result.map(row => {
          let obj = {
            user_id: row.id,
            schedule_id: row.schedule_id,
            date: new Date()
          };
          arr.push(obj);
        });

        APP.models.company[req.user.db].mysql.presence
          .bulkCreate(arr)
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error createBulk function createPresence',
              data: err
            });
          });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.checkInOutProcess = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBLEDevice(callback) {
        APP.models.company[req.user.db].mysql.device
          .findOne({
            where: {
              mac: req.body.mac
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Data BLE Device tidak ditemukan'
              });
            }

            callback(null, res);
          });
      },

      function checkSchedule(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              id: req.user.id
            }
          })
          .then(user => {
            APP.models.company[req.user.db].mysql.schedule
              .findOne({
                where: {
                  id: user.schedule_id
                }
              })
              .then(res => {
                if (res === null) {
                  callback({
                    code: 'NOT_FOUND',
                    message: 'Schedule tidak ditemukan.'
                  });
                }

                callback(null, {
                  device: result,
                  schedule: res
                });
              });
          });
      },

      function checkBranchLocation(result, callback) {
        let radius = 1;
        // 6371 radius bumi yang diukur dengan satuan kilometer
        APP.db.sequelize
          .query(
            `SELECT
                      id, (
                        6371 * acos (
                          cos ( radians(${req.body.lat}) )
                          * cos( radians( latitude ) )
                          * cos( radians( longitude ) - radians(${req.body.lng}) )
                          + sin ( radians(${req.body.lat}) )
                          * sin( radians( latitude ) )
                        )
                      ) AS distance
                    FROM ${req.user.db}.branch
                    HAVING distance <= ${radius}`
          )
          .then(res => {
            console.log('helooo', res);

            if (res[0].length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Data branch tidak ditemukan!'
              });
            }

            callback(null, {
              device: result.device,
              schedule: result.schedule,
              branch: res[0]
            });
          });
      },

      function checkInOut(result, callback) {
        // var time = moment() gives you current time. no format required.
        let time = moment(),
          checkInStart = moment(result.schedule.check_in_start, 'hh:mm:ss'),
          checkInEnd = moment(result.schedule.check_in_end, 'hh:mm:ss'),
          checkOutStart = moment(result.schedule.check_out_start, 'hh:mm:ss'),
          checkOutEnd = moment(result.schedule.check_out_end, 'hh:mm:ss');

        console.log(time);

        if (time.isBetween(checkInStart, checkInEnd)) {
          console.log('between check in');
        }

        if (time.isBetween(checkOutStart, checkOutEnd)) {
          console.log('between check out');
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
