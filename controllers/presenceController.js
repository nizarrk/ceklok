'use strict';

const async = require('async');
const moment = require('moment');

exports.generateDailyPresence = (APP, req, callback) => {
  let { presence_setting, presence, presence_monthly, employee, schedule } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function getPresenceSettings(callback) {
        let status = [];
        presence_setting
          .findAll()
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Presence setting tidak ditemukan'
              });
            }
            res.map(data => {
              status.push(data.dataValues);
            });
            callback(null, status);
          })
          .catch(err => {
            console.log('Error getPresenceSettings', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getPresenceSettings',
              data: err
            });
          });
      },

      function checkYesterdayPresence(result, callback) {
        let yesterday = moment().subtract(1, 'days');

        presence.belongsTo(schedule, {
          targetKey: 'id',
          foreignKey: 'schedule_id'
        });

        presence
          .findAll({
            include: [
              {
                model: schedule,
                attributes: ['work_time', 'work_day']
              }
            ],
            where: {
              presence_setting_id: result[3].id, // 'WA'
              date: {
                $eq: yesterday.format('YYYY-MM-DD')
              }
            }
          })
          .then(res => {
            if (res.length == 0) {
              console.log('gaonok sing absen utowo cuti');
              callback(null, {
                status: result,
                data: res,
                yesterday: yesterday
              });
            } else {
              Promise.all(
                res.map((data, index) => {
                  let leaveDay = [0, 1, 2, 3, 4, 5, 6]; // 0 - 6 is day in weeks sunday to saturday
                  let workDay = data.schedule.work_day;

                  leaveDay = leaveDay.filter(item => {
                    return !workDay.includes(item);
                  });

                  leaveDay = leaveDay.filter(x => {
                    return x == yesterday.day();
                  });
                  console.log(leaveDay);

                  if (leaveDay.length > 0) {
                    presence
                      .update(
                        {
                          presence_setting_id: result[7].id // 'LD'
                        },
                        {
                          where: {
                            id: data.id
                          }
                        }
                      )
                      .then(updated => {
                        console.log('hasile LD', updated);
                      });
                  }

                  if (leaveDay.length == 0 && data.check_in !== '00:00:00' && data.check_out == '00:00:00') {
                    presence
                      .update(
                        {
                          presence_setting_id: result[2].id, // 'NCO'
                          total_minus: data.schedule.work_time
                        },
                        {
                          where: {
                            id: data.id,
                            check_out: '00:00:00'
                          }
                        }
                      )
                      .then(updated => {
                        console.log('hasile NCO', updated);
                      });
                  }

                  if (leaveDay.length == 0 && data.check_in == '00:00:00' && data.check_out == '00:00:00') {
                    presence
                      .update(
                        {
                          presence_setting_id: result[4].id, // 'A'
                          total_minus: data.schedule.work_time
                        },
                        {
                          where: {
                            id: data.id
                          }
                        }
                      )
                      .then(updated => {
                        console.log('hasile A', updated);
                      });
                  }
                })
              )
                .then(() => {
                  callback(null, {
                    status: result,
                    data: res,
                    yesterday: yesterday
                  });
                })
                .catch(err => {
                  console.log('Error checkYesterdayPresence', err);
                  callback({
                    code: 'ERR',
                    id: '',
                    message: '',
                    data: err
                  });
                });
            }
          })
          .catch(err => {
            console.log('Error checkYesterdayPresence', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error checkYesterdayPresence',
              data: err
            });
          });
      },

      function checkAbsentCuti(result, callback) {
        if (result.data.length == 0) {
          return callback(null, result);
        }
        Promise.all(
          result.data.map((data, index) => {
            APP.db.sequelize
              .query(
                `SELECT * FROM ${req.user.db}.absent_cuti
              WHERE
                user_id = ${data.user_id} 
              AND
                status = 1
              AND
                '${result.yesterday}' >= date_format(date_start, '%Y-%m-%d') AND '${result.yesterday}' <= date_format(date_end, '%Y-%m-%d')`
              )
              .then(found => {
                return found[0].map(x => {
                  if (x.type == 0) {
                    presence
                      .update(
                        {
                          presence_setting_id: result.status[5].id, // 'I'
                          total_minus: x.time_total
                        },
                        {
                          where: {
                            id: data.id
                          }
                        }
                      )
                      .then(updated => {
                        console.log('hasile I', updated);
                      });
                  }

                  if (x.type == 1) {
                    presence
                      .update(
                        {
                          presence_setting_id: result.status[6].id // 'C'
                        },
                        {
                          where: {
                            id: data.id
                          }
                        }
                      )
                      .then(updated => {
                        console.log('hasile C', updated);
                      });
                  }
                });
              })
              .catch(err => {
                console.log('Error checkAbsentCuti', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error checkAbsentCuti',
                  data: err
                });
              });
          })
        )
          .then(() => {
            callback(null, result);
          })
          .catch(err => {
            console.log('Error checkAbsentCuti', err);
            callback({
              code: 'ERR',
              id: '',
              message: '',
              data: err
            });
          });
      },

      // function checkTodayPresence(result, callback) {presence
      //     .findAll({
      //       where: {
      //         date: new Date()
      //       }
      //     })
      //     .then(res => {
      //       if (res.length == 0) {
      //         callback(null, result);
      //       } else {
      //         callback({
      //           code: 'INVALID_REQUEST',
      //           message: 'Data Presence hari ini sudah di generate'
      //         });
      //       }
      //     });
      // },

      function getEmployeeData(result, callback) {
        employee.belongsTo(schedule, {
          targetKey: 'id',
          foreignKey: 'schedule_id'
        });

        employee
          .findAll({
            attributes: [
              'id',
              'grade_id',
              'job_title_id',
              'schedule_id',
              'employee_code',
              'company_code',
              'nik',
              'name'
            ],
            include: [
              {
                model: schedule,
                attributes: ['work_time']
              }
            ],
            where: {
              status: 1
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Data pegawai tidak ditemukan!'
              });
            } else {
              callback(null, {
                data: result,
                employee: res
              });
            }
          })
          .catch(err => {
            console.log('Error getEmployeeData', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getEmployeeData',
              data: err
            });
          });
      },

      function createPresence(result, callback) {
        Promise.all(
          result.employee.map(row => {
            let obj = {
              user_id: row.id,
              schedule_id: row.schedule_id,
              date: moment(),
              presence_setting_id: result.data.status[3].id
            };
            return obj;
          })
        )
          .then(arr => {
            presence
              .bulkCreate(arr)
              .then(() => {
                callback(null, {
                  yesterday: result.yesterday,
                  employee: result.employee
                });
              })
              .catch(err => {
                console.log('Error createBulk function createPresence', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error createBulk function createPresence',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              message: 'Error promise.all createPresence',
              data: err
            });
          });
      },

      function createMonthlyPresence(result, callback) {
        presence_monthly
          .findAll()
          .then(res => {
            if (res.length == 0) {
              console.log('masuk length = 0');

              Promise.all(
                result.employee.map((data, index) => {
                  let obj = {
                    user_id: data.id,
                    date: moment().format('YYYY-MM-DD'),
                    total_time: '00:00:00',
                    total_minus: '00:00:00',
                    total_over: '00:00:00',
                    total_present: 0,
                    total_absent: 0,
                    total_permission: 0,
                    total_cuti: 0,
                    total_day: 0,
                    percentage: 0
                  };
                  return obj;
                })
              )
                .then(arr => {
                  presence_monthly
                    .bulkCreate(arr)
                    .then(res => {
                      callback(null, {
                        data: res,
                        type: 'insert'
                      });
                    })
                    .catch(err => {
                      console.log('Error bulkCreate function createMonthlyPresence', err);
                      callback({
                        code: 'ERR_DATABASE',
                        message: 'Error bulkCreate function createMonthlyPresence',
                        data: err
                      });
                    });
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR',
                    message: 'Error promise.all createMonthlyPresence',
                    data: err
                  });
                });
            } else {
              console.log('masuk length > 0');
              let arr = [];
              let totalTime = {};
              let totalMinus = {};
              let totalOver = {};
              let hadir = {};
              let absen = {};
              let cuti = {};
              let izin = {};
              let percentage = {};

              result.employee.map((data, index) => {
                totalTime[data.id] = [];
                totalMinus[data.id] = [];
                totalOver[data.id] = [];
                hadir[data.id] = 0;
                absen[data.id] = 0;
                cuti[data.id] = 0;
                izin[data.id] = 0;
                percentage[data.id] = 0;

                presence
                  .findAll({
                    where: {
                      user_id: data.id,
                      date: {
                        $not: moment().format('YYYY-MM-DD')
                      }
                    }
                  })
                  .then(found => {
                    if (found.length == 0) {
                      presence_monthly
                        .findOne({
                          where: {
                            user_id: data.id
                          }
                        })
                        .then(res => {
                          if (res == null) {
                            presence_monthly
                              .create({
                                user_id: data.id,
                                date: moment().format('YYYY-MM-DD'),
                                total_time: '00:00:00',
                                total_minus: '00:00:00',
                                total_over: '00:00:00',
                                total_present: 0,
                                total_absent: 0,
                                total_permission: 0,
                                total_cuti: 0,
                                total_day: 0,
                                percentage: 0
                              })
                              .then(res => {
                                console.log('new employee insert');
                                console.log(res.user_id);
                                if (result.employee.length == index + 1) {
                                  callback(null, arr);
                                }
                              });
                          } else {
                            if (result.employee.length == index + 1) {
                              callback(null, arr);
                            }
                          }
                        });
                    } else {
                      console.log(index + 1);
                      console.log('jumlah : ', found.length);

                      found.map((x, index2) => {
                        totalTime[data.id].push(x.total_time);
                        totalMinus[data.id].push(x.total_minus);
                        totalOver[data.id].push(x.total_over);

                        let workTime = moment.duration(APP.time.timeXday(data.schedule.work_time, found.length));
                        let workTotal = moment.duration(APP.time.timeDuration(totalTime[data.id]));
                        let workMinus = moment.duration(APP.time.timeDuration(totalMinus[data.id]));
                        let workOver = moment.duration(APP.time.timeDuration(totalOver[data.id]));
                        let resultMinus = moment.duration(workTime - workMinus);
                        percentage[data.id] = (resultMinus / workTime) * 100;

                        x.presence_setting_id == 1 ? hadir[data.id]++ : hadir[data.id]; // H
                        x.presence_setting_id == 2 ? absen[data.id]++ : absen[data.id]; // NCI
                        x.presence_setting_id == 3 ? absen[data.id]++ : absen[data.id]; // NCO
                        x.presence_setting_id == 5 ? absen[data.id]++ : absen[data.id]; // A
                        x.presence_setting_id == 7 ? cuti[data.id]++ : cuti[data.id]; // C
                        x.presence_setting_id == 6 ? izin[data.id]++ : izin[data.id]; // I

                        // push index yang terakhir aja
                        if (index2 + 1 == found.length) {
                          let timeCompare = moment.duration(
                            APP.time.timeSubstract(
                              APP.time.timeDuration(totalTime[data.id]),
                              APP.time.timeXday(data.schedule.work_time, found.length)
                            )
                          );

                          if (timeCompare < 0) {
                            console.log('masuk if < 0');

                            workMinus = APP.time.timeSubstract(
                              APP.time.timeDuration(totalTime[data.id]),
                              APP.time.timeXday(data.schedule.work_time, found.length)
                            );
                            workOver = '00:00:00';
                          }

                          if (timeCompare > 0) {
                            console.log('masuk if > 0');
                            workOver = APP.time.timeSubstract(
                              APP.time.timeDuration(totalTime[data.id]),
                              APP.time.timeXday(data.schedule.work_time, found.length)
                            );
                            workMinus = '00:00:00';
                          }

                          arr.push({
                            id: x.id,
                            user_id: x.user_id,
                            date: moment().format('YYYY-MM-DD'),
                            total_time: APP.time.timeDuration(totalTime[data.id]),
                            total_minus: workMinus.replace('-', ''), // replace buat hilangin minus
                            total_over: workOver,
                            total_present: hadir[data.id],
                            total_absent: absen[data.id],
                            total_permission: izin[data.id],
                            total_cuti: cuti[data.id],
                            total_day: found.length,
                            percentage: percentage[data.id]
                          });
                        }

                        if (result.employee.length == index + 1 && found.length == index2 + 1) {
                          callback(null, arr);
                        }
                      });
                    }
                  });
              });
            }
          })
          .catch(err => {
            console.log('Error function createMonthlyPresence', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error function createMonthlyPresence',
              data: err
            });
          });
      },

      function updateMonthlyPresence(result, callback) {
        if (result.type == 'insert') {
          return callback(null, {
            code: 'INSERT_SUCCESS',
            data: result.data
          });
        } else {
          Promise.all(
            result.map((x, i) => {
              return presence_monthly
                .update(
                  {
                    date: moment().format('YYYY-MM-DD'),
                    total_time: x.total_time,
                    total_minus: x.total_minus,
                    total_over: x.total_over,
                    total_present: x.total_present,
                    total_absent: x.total_absent,
                    total_permission: x.total_permission,
                    total_cuti: x.total_cuti,
                    total_day: x.total_day,
                    percentage: x.percentage
                  },
                  {
                    where: {
                      user_id: x.user_id
                    }
                  }
                )
                .then(updated => {
                  return updated;
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: '',
                    data: err
                  });
                });
            })
          )
            .then(arr => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                data: arr
              });
            })
            .catch(err => {
              callback({
                code: 'ERR',
                data: err
              });
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
        // 6371 radius bumi yang diukur dengan satuan kilometer
        APP.db.sequelize
          .query(
            `SELECT x.* FROM (
              SELECT
                id, name, radius, (
                  6371 * acos (
                    cos ( radians(${req.body.lat}) )
                    * cos( radians( latitude ) )
                    * cos( radians( longitude ) - radians(${req.body.lng}) )
                    + sin ( radians(${req.body.lat}) )
                    * sin( radians( latitude ) )
                  )
                ) AS distance
              FROM ${req.user.db}.branch
            ) AS x
            WHERE 
              x.distance <= x.radius`
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

      function getPresenceSettings(result, callback) {
        let status = [];
        APP.models.company[req.user.db].mysql.presence_setting.findAll().then(res => {
          if (res == null) {
            return callback({
              code: 'NOT_FOUND',
              message: 'Presence setting tidak ditemukan'
            });
          }
          res.map(data => {
            status.push(data.dataValues);
          });

          callback(null, {
            device: result.device,
            schedule: result.schedule,
            branch: result.branch,
            status: status
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
                  $eq: moment().format('YYYY-MM-DD') // today
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
              let totalTime = moment
                .utc(moment(time, 'HH:mm:ss').diff(moment(res.check_in, 'HH:mm:ss')))
                .format('HH:mm:ss');

              let params = {
                check_out_device_id: result.device.id,
                check_out_branch_id: result.branch.id,
                check_out: time.format('HH:mm:ss'),
                total_time: totalTime,
                total_minus:
                  totalTime < result.schedule.work_time
                    ? moment
                        .utc(moment(result.schedule.work_time, 'HH:mm:ss').diff(moment(totalTime, 'HH:mm:ss')))
                        .format('HH:mm:ss')
                    : '00:00:00',
                total_over:
                  totalTime > result.schedule.work_time
                    ? moment
                        .utc(moment(totalTime, 'HH:mm:ss').diff(moment(result.schedule.work_time, 'HH:mm:ss')))
                        .format('HH:mm:ss')
                    : '00:00:00',
                presence_setting_id: result.status[0].id // 'H'
              };

              // NCI
              if (res.check_in == '00:00:00') {
                params = {
                  check_out_device_id: result.device.id,
                  check_out_branch_id: result.branch.id,
                  check_out: time.format('HH:mm:ss'),
                  total_time: '00:00:00',
                  total_minus: result.schedule.work_time,
                  total_over: '00:00:00',
                  presence_setting_id: result.status[1].id // 'NCI'
                };
              }

              res
                .update(params)
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
  let query = `SELECT 
                presence.id, presence.user_id, presence.check_in_device_id, 
                presence.check_out_device_id, presence.check_in_branch_id, 
                presence.check_out_branch_id, presence.date, presence.check_in, 
                presence.check_out, presence.total_time, presence.presence_setting_id, 
                employee.id AS 'employee_id', 
                employee.nik AS 'employee_nik', 
                employee.name AS 'employee_name', 		
                check_in_device.name AS 'check_in_device_name',
                check_in_device.location AS 'check_in_device_location',
                check_in_device.major AS 'check_in_device_major',
                check_in_device.minor AS 'check_in_device_minor',
                check_out_device.name AS 'check_out_device_name',
                check_out_device.location AS 'check_out_device_location',
                check_in_branch.name AS 'check_in_branch_name',
                check_in_branch.address AS 'check_in_branch_address',
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

exports.presenceSettings = (APP, req, callback) => {
  if (req.user.level === 1) {
    let { presence_setting_master } = APP.models.mysql;
    let { settings } = req.body;

    if (!settings) {
      callback({
        code: 'INVALID_REQUEST',
        id: 'SPQ96',
        message: 'Kesalahan pada parameter'
      });
    } else {
      Promise.all(
        settings.map((x, index) => {
          let obj = {};

          obj.name = settings[index].name;
          obj.description = settings[index].desc;

          return obj;
        })
      ).then(arr => {
        presence_setting_master
          .bulkCreate(arr)
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'SPP00',
              message: 'Setting presence berhasil diubah',
              data: res
            });
          })
          .catch(err => {
            console.log('Error addSetting', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'SPQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      });
    }
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};

exports.presenceSettingsCompany = (APP, req, callback) => {
  if (req.user.level === 2) {
    let { presence_setting_master } = APP.models.mysql;
    let { presence_setting } = APP.models.company[req.user.db].mysql;
    let { type, value, desc } = req.body;

    async.waterfall(
      [
        function checkParam(callback) {
          if (type && value) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'SPQ96',
              message: 'Kesalahan pada parameter'
            });
          }
        },

        function checkpresenceType(data, callback) {
          presence_setting_master
            .findOne({
              where: {
                id: type
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'NOT_FOUND',
                  message: 'presence_setting_master tidak ditemukan'
                });
              }
              callback(null, true);
            })
            .catch(err => {
              console.log('Error checkpresenceType', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error checkpresenceType',
                data: err
              });
            });
        },

        function addSettings(data, callback) {
          presence_setting
            .create({
              presence_setting_id: type,
              value: value,
              description: desc
            })
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                id: 'SPP00',
                message: 'Setting presence berhasil diubah',
                data: res
              });
            })
            .catch(err => {
              console.log('Error addSetting', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SPQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        }
      ],
      (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(null, result);
      }
    );
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};
