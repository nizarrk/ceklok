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
            });
        });
        callback(null, true);
      },

      function checkTodayPresence(result, callback) {
        APP.models.company[req.user.db].mysql.presence
          .findAll({
            where: {
              date: new Date()
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Data Presence hari ini sudah di generate'
              });
            }
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

exports.getHistoryCheckInOut = (APP, req, callback) => {
  let query = `SELECT presence.id, presence.user_id, presence.check_in_device_id, 
                presence.check_out_device_id, presence.check_in_branch_id, 
                presence.check_out_branch_id, presence.date, presence.check_in, 
                presence.check_out, presence.total_time, presence.status, 
                employee.id AS 'employee_id', 
                employee.nik AS 'employee_nik', 
                employee.name AS 'employee_name', 		
                check_in_device.id AS 'check_in_device_id', 
                check_in_device.name AS 'check_in_device_name',
                check_in_device.location AS 'check_in_device_location',
                check_in_device.major AS 'check_in_device_major',
                check_in_device.minor AS 'check_in_device_minor',
                check_out_device.id AS 'check_out_device_id',
                check_out_device.name AS 'check_out_device_name',
                check_out_device.location AS 'check_out_device_location',
                check_out_device.major AS 'check_out_device_major',
                check_out_device.minor AS 'check_out_device_minor',
                check_in_branch.id AS 'check_in_branch_id',
                check_in_branch.name AS 'check_in_branch_name',
                check_in_branch.address AS 'check_in_branch_address',
                check_out_branch.id AS 'check_out_branch_id',
                check_out_branch.name AS 'check_out_branch_name',
                check_out_branch.address AS 'check_out_branch_address' 
              FROM 
                ${req.user.db}.presence AS presence 
              LEFT OUTER JOIN 
                ${req.user.db}.employee AS employee ON presence.user_id = employee.id 
              LEFT OUTER JOIN 
                ${req.user.db}.device AS check_in_device ON presence.check_in_device_id = check_in_device.id 
              LEFT OUTER JOIN 
                ${req.user.db}.device AS check_out_device ON presence.check_out_device_id = check_out_device.id 
              LEFT OUTER JOIN 
                ${req.user.db}.branch AS check_in_branch ON presence.check_in_branch_id = check_in_branch.id 
              LEFT OUTER JOIN 
                ${req.user.db}.branch AS check_out_branch ON presence.check_out_branch_id = check_out_branch.id
              WHERE  
                ${req.user.db}.presence.date 
              BETWEEN 
                '${req.body.datestart ? req.body.datestart : moment().format('YYYY-MM-DD')}' 
              AND 
                '${req.body.dateend ? req.body.dateend : moment().format('YYYY-MM-DD')}'`;

  if (req.body.status) {
    query += ` AND presence.status = '${req.body.status}'`;
  }

  if (!req.user.admin) {
    query += ` AND presence.user_id = ${req.user.id}`;
  }

  APP.db.sequelize
    .query(query)
    .then(rows => {
      return callback(null, {
        code: rows[0] && rows[0].length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows[0],
        info: {
          dataCount: rows[0].length
        }
      });
    })
    .catch(err => {
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.checkStatus = (APP, req, callback) => {
  APP.models.company[req.user.db].mysql.presence
    .findOne({
      where: {
        user_id: req.user.id,
        date: moment().format('YYYY-MM-DD')
      }
    })
    .then(res => {
      if (res == null) {
        return callback(null, {
          code: 'NOT_FOUND',
          message: 'Presensi hari ini tidak ditemukan'
        });
      }

      callback(null, {
        code: 'FOUND',
        data: res
      });
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};
