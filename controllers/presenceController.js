'use strict';

const async = require('async');
const moment = require('moment');

exports.generateDailyPresence = (APP, req, callback) => {
  async.waterfall(
    [
      function checkYesterdayPresence(callback) {
        let yesterday = moment()
          .subtract(1, 'days')
          .format('YYYY-MM-DD');
        console.log(yesterday);

        APP.models.company[req.user.db].mysql.presence
          .findAll({
            where: {
              status: 'WA',
              date: {
                $eq: yesterday
              }
            }
          })
          .then(res => {
            if (res.length == 0) {
              console.log('gaonok sing absen utowo cuti');
              return callback(null, {
                data: res,
                yesterday: yesterday
              });
            }

            res.map((data, index) => {
              if (data.check_out == '00:00:00') {
                APP.models.company[req.user.db].mysql.presence
                  .update(
                    {
                      status: 'NCO'
                    },
                    {
                      where: {
                        id: data.id,
                        check_out: '00:00:00'
                      }
                    }
                  )
                  .then(updated => {
                    if (res.length == index + 1) {
                      console.log('hasile bro', updated);
                      callback(null, {
                        data: res,
                        yesterday: yesterday
                      });
                    }
                  })
                  .catch(err => {
                    callback({
                      code: 'ERR_DATABASE',
                      message: 'Error update presensi',
                      data: err
                    });
                  });
              }
            });

            callback(null, {
              data: res,
              yesterday: yesterday
            });
          });
      },

      function checkAbsentCuti(result, callback) {
        if (result.data.length == 0) {
          return callback(null, true);
        }

        result.data.map((data, index) => {
          APP.db.sequelize
            .query(
              `SELECT * FROM ${req.user.db}.absent_cuti
            WHERE
              user_id = ${data.user_id} 
            AND
              '${result.yesterday}' >= date_format(date_start, '%Y-%m-%d') AND '${result.yesterday}' <= date_format(date_end, '%Y-%m-%d')`
            )
            .then(found => {
              if (found[0].length == 0) {
                APP.models.company[req.user.db].mysql.presence
                  .update(
                    {
                      status: 'A'
                    },
                    {
                      where: {
                        id: data.id
                      }
                    }
                  )
                  .then(updated => {
                    if (result.data.length == index + 1) {
                      console.log('hasile bro', updated);
                      // callback(null, updated)
                    }
                  })
                  .catch(err => {
                    if (result.data.length == index + 1) {
                      console.log(err);
                      callback({
                        code: 'ERR_DATABASE',
                        message: 'Error update presensi',
                        data: err
                      });
                    }
                  });
              }

              found[0].map(x => {
                if (x.type == 0) {
                  APP.models.company[req.user.db].mysql.presence
                    .update(
                      {
                        status: 'I'
                      },
                      {
                        where: {
                          id: data.id
                        }
                      }
                    )
                    .then(updated => {
                      if (result.data.length == index + 1) {
                        console.log('hasile bro', updated);
                        // callback(null, updated)
                      }
                    })
                    .catch(err => {
                      if (result.data.length == index + 1) {
                        console.log(err);
                        callback({
                          code: 'ERR_DATABASE',
                          message: 'Error update presensi',
                          data: err
                        });
                      }
                    });
                }

                if (x.type == 1) {
                  APP.models.company[req.user.db].mysql.presence
                    .update(
                      {
                        status: 'C'
                      },
                      {
                        where: {
                          id: data.id
                        }
                      }
                    )
                    .then(updated => {
                      if (result.data.length == index + 1) {
                        console.log('hasile bro', updated);
                        // callback(null, updated)
                      }
                    })
                    .catch(err => {
                      if (result.data.length == index + 1) {
                        console.log(err);
                        callback({
                          code: 'ERR_DATABASE',
                          message: 'Error update presensi',
                          data: err
                        });
                      }
                    });
                }
              });
              callback(null, true);
            });
        });
      },

      function getEmployeeData(result, callback) {
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
        let radius = 1; // 1km
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
            if (res[0].length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Data branch tidak ditemukan!'
              });
            }

            callback(null, {
              device: result.device,
              schedule: result.schedule,
              branch: res[0][0]
            });
          });
      },

      function checkInOut(result, callback) {
        // var time = moment() gives you current time. no format required.
        let time = moment(),
          checkInStart = moment(result.schedule.check_in_start, 'HH:mm:ss'),
          checkInEnd = moment(result.schedule.check_in_end, 'HH:mm:ss'),
          checkOutStart = moment(result.schedule.check_out_start, 'HH:mm:ss'),
          checkOutEnd = moment(result.schedule.check_out_end, 'HH:mm:ss');

        console.log(time.format('HH:mm:ss'));
        console.log(result.branch);

        // check in
        if (time.isBetween(checkInStart, checkInEnd)) {
          APP.models.company[req.user.db].mysql.presence
            .findOne({
              where: {
                user_id: req.user.id,
                date: {
                  $eq: moment().format('YYYY-MM-DD')
                }
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'UPDATE_NONE',
                  message: 'Data absensi tidak ditemukan'
                });
              }

              if (res.check_in !== '00:00:00') {
                return callback({
                  code: 'UPDATE_NONE',
                  message: 'Data check in sudah ada'
                });
              }

              res
                .update({
                  check_in_device_id: result.device.id,
                  check_in_branch_id: result.branch.id,
                  check_in: time.format('HH:mm:ss')
                })
                .then(updated => {
                  callback(null, {
                    code: 'UPDATE_SUCCESS',
                    message: 'Berhasil melakukan Check In',
                    data: updated
                  });
                })
                .catch(err => {
                  console.log('Error update checkInOutProcess', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error update checkInOutProcess',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findOne checkInOutProcess', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error findOne checkInOutProcess',
                data: err
              });
            });
          console.log('between check in');
        }

        //check out
        else if (time.isBetween(checkOutStart, checkOutEnd)) {
          APP.models.company[req.user.db].mysql.presence
            .findOne({
              where: {
                user_id: req.user.id,
                date: {
                  $eq: moment().format('YYYY-MM-DD')
                }
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'UPDATE_NONE',
                  message: 'Data absensi tidak ditemukan'
                });
              }

              res
                .update({
                  check_out_device_id: result.device.id,
                  check_out_branch_id: result.branch.id,
                  check_out: time.format('HH:mm:ss'),
                  total_time:
                    res.check_in == '00:00:00'
                      ? '00:00:00'
                      : moment.utc(moment(time, 'HH:mm:ss').diff(moment(res.check_in, 'HH:mm:ss'))).format('HH:mm:ss'),
                  status: res.check_in == '00:00:00' ? 'NCI' : 'H'
                })
                .then(updated => {
                  callback(null, {
                    code: 'UPDATE_SUCCESS',
                    message: 'Berhasil melakukan Check Out',
                    data: updated
                  });
                })
                .catch(err => {
                  console.log('Error update checkInOutProcess', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error update checkInOutProcess',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findOne checkInOutProcess', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error findOne checkInOutProcess',
                data: err
              });
            });
          console.log('between check out');
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Proses check in / out bermasalah'
          });
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
