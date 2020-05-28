'use strict';

const async = require('async');
const moment = require('moment');
const fs = require('fs');
const mkdirp = require('mkdirp');

// fungsinya dipanggil cron
exports.generateDailyPresence = (APP, req, callback) => {
  let { presence_setting, presence, presence_monthly, presence_period, employee, schedule } = APP.models.company[
    `${process.env.MYSQL_NAME}_${req.body.company}`
  ].mysql;
  async.waterfall(
    [
      function checkSettingCutOffMonthly(callback) {
        presence_setting
          .findOne({
            where: {
              presence_setting_id: 3
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Setting Cut Off tidak ditemukan!'
              });
            } else {
              callback(null, res.dataValues);
            }
          });
      },

      function checkPresencePeriod(result, callback) {
        let value = result.value.split(',');
        let monthName = moment().format('MMMM');
        let year = moment().format('YYYY');

        presence_period
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('Period Not Found');

              presence_period
                .create({
                  name: monthName,
                  description: 'Initial Generate',
                  period: year,
                  date_start: `${moment()
                    .subtract(1, 'month')
                    .format('YYYY-MM')}-${value[0]}`,
                  date_end: `${moment().format('YYYY-MM')}-${value[1]}`
                })
                .then(created => {
                  callback(null, {
                    id: created.id,
                    datestart: created.date_start,
                    dateend: created.date_end,
                    year: created.year
                  });
                })
                .catch(err => {
                  console.log('Error create checkPresencePeriod', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error create checkPresencePeriod',
                    data: err
                  });
                });
            } else {
              console.log('Period Found');

              let isBetween = moment().isBetween(res[0].date_start, res[0].date_end);
              if (isBetween) {
                console.log('isBetween');
                callback(null, {
                  id: res[0].id,
                  datestart: res[0].date_start,
                  dateend: res[0].date_end,
                  year: res[0].year
                });
              } else {
                console.log('!isBetween');
                presence_period
                  .create({
                    name: moment()
                      .add(1, 'months')
                      .format('MMMM'),
                    description: 'Generated Period',
                    period: year,
                    date_start: `${moment().format('YYYY-MM')}-${value[0]}`,
                    date_end: `${moment()
                      .add(1, 'months')
                      .format('YYYY-MM')}-${value[1]}`
                  })
                  .then(created => {
                    callback(null, {
                      id: created.id,
                      datestart: created.date_start,
                      dateend: created.date_end,
                      year: created.year
                    });
                  })
                  .catch(err => {
                    console.log('Error create else checkPresencePeriod', err);
                    callback({
                      code: 'ERR_DATABASE',
                      message: 'Error create else checkPresencePeriod',
                      data: err
                    });
                  });
              }
            }
          })
          .catch(err => {
            console.log('Error findAll checkPresencePeriod', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error findAll checkPresencePeriod',
              data: err
            });
          });
      },

      function getPresenceSettings(result, callback) {
        presence_setting
          .findAll({
            where: {
              presence_setting_id: 1
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Presence setting tidak ditemukan'
              });
            } else {
              Promise.all(
                res.map(x => {
                  return x.dataValues;
                })
              )
                .then(arr => {
                  callback(null, {
                    period: result,
                    status: arr
                  });
                })
                .catch(err => {
                  console.log('Error getPresenceSettings', err);
                  callback({
                    code: 'ERR',
                    message: 'Error getPresenceSettings',
                    data: err
                  });
                });
            }
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
              presence_setting_id: [result.status[0].id, result.status[3].id], // 'H' 'WA'
              date: {
                $eq: yesterday.format('YYYY-MM-DD')
              }
            }
          })
          .then(res => {
            if (res.length == 0) {
              console.log('Tidak ada WA & H');
              callback(null, {
                status: result.status,
                period: result.period,
                data: res,
                yesterday: yesterday.format('YYYY-MM-DD')
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
                          presence_setting_id: result.status[7].id // 'LD'
                        },
                        {
                          where: {
                            id: data.id
                          }
                        }
                      )
                      .then(updated => {
                        console.log('Hasil LD', updated);
                      });
                  }

                  if (leaveDay.length == 0 && data.check_in !== '00:00:00' && data.check_out == '00:00:00') {
                    presence
                      .update(
                        {
                          presence_setting_id: result.status[2].id, // 'NCO'
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
                        console.log('Hasil NCO', updated);
                      });
                  }

                  if (
                    leaveDay.length == 0 &&
                    (data.presence_setting_id == 1 || (data.check_in == '00:00:00' && data.check_out == '00:00:00'))
                  ) {
                    // check izin dan cuti
                    APP.db.sequelize
                      .query(
                        `SELECT * FROM ${process.env.MYSQL_NAME}_${req.body.company}.absent_cuti
                      WHERE
                        user_id = ${data.user_id} 
                      AND
                        status = 1
                      AND
                        '${yesterday.format('YYYY-MM-DD')}' >= date_format(date_start, '%Y-%m-%d') 
                      AND 
                        '${yesterday.format('YYYY-MM-DD')}' <= date_format(date_end, '%Y-%m-%d')`
                      )
                      .then(found => {
                        if (found[0].length == 0) {
                          if (data.presence_setting_id == 1) {
                            console.log('cek aja lur!!!', data.user_id);
                          } else {
                            console.log('absen nangdi lur?', data.user_id);
                            // Data Absent Cuti Not Found == Absent
                            presence
                              .update(
                                {
                                  presence_setting_id: result.status[4].id, // 'A'
                                  total_minus: data.schedule.work_time
                                },
                                {
                                  where: {
                                    id: data.id
                                  }
                                }
                              )
                              .then(updated => {
                                console.log('Hasil A', updated);
                              });
                          }
                        } else {
                          // Data Absent Cuti Found
                          return found[0].map(x => {
                            if (x.type == 0) {
                              presence
                                .update(
                                  {
                                    presence_setting_id:
                                      data.presence_setting_id == 1 ? result.status[0].id : result.status[5].id, //'H' 'I'
                                    total_minus: APP.time.timeDuration([x.time_total, found[0][0].time_total])
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
                            } else if (x.type == 1) {
                              presence
                                .update(
                                  {
                                    presence_setting_id: result.status[6].id, // 'C'
                                    total_minus: x.time_total
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
                            } else {
                              console.log('Type Unknown!');
                            }
                          });
                        }
                      })
                      .catch(err => {
                        console.log('Error checkAbsentCuti', err);
                        callback({
                          code: 'ERR_DATABASE',
                          message: 'Error checkAbsentCuti',
                          data: err
                        });
                      });
                  }
                })
              )
                .then(() => {
                  callback(null, {
                    status: result.status,
                    period: result.period,
                    data: res,
                    yesterday: yesterday.format('YYYY-MM-DD')
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
                status: result.status,
                period: result.period,
                data: result.data,
                yesterday: result.yesterday,
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
        presence
          .findAll({
            where: {
              date: new Date()
            }
          })
          .then(res => {
            if (res.length == 0) {
              console.log('Presence Daily Generated!');

              Promise.all(
                result.employee.map(row => {
                  let obj = {
                    user_id: row.id,
                    schedule_id: row.schedule_id,
                    date: moment(),
                    presence_setting_id: result.status[3].id
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
                        period: result.period,
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
                  console.log('Error promise.all createPresence', err);
                  callback({
                    code: 'ERR',
                    message: 'Error promise.all createPresence',
                    data: err
                  });
                });
            } else {
              console.log('Presence Daily Already Generated!');
              callback(null, result);
            }
          })
          .catch(err => {
            console.log('Error findAll createPresence', err);
            callback({
              code: 'ERR',
              message: 'Error findAll createPresence',
              data: err
            });
          });
      },

      function createMonthlyPresence(result, callback) {
        console.log('periodene bro', result.period);
        presence_monthly
          .findAll({
            where: {
              presence_period_id: result.period.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              console.log('masuk length = 0');

              Promise.all(
                result.employee.map((data, index) => {
                  let obj = {
                    user_id: data.id,
                    presence_period_id: result.period.id,
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
                  console.log('Error promise.all createMonthlyPresence', err);
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

              Promise.all(
                result.employee.map((data, index) => {
                  totalTime[data.id] = [];
                  totalMinus[data.id] = [];
                  totalOver[data.id] = [];
                  hadir[data.id] = 0;
                  absen[data.id] = 0;
                  cuti[data.id] = 0;
                  izin[data.id] = 0;
                  percentage[data.id] = 0;

                  return presence
                    .findAll({
                      where: {
                        user_id: data.id,
                        date: {
                          $between: [
                            result.period.datestart,
                            moment()
                              .subtract(1, 'days')
                              .format('YYYY-MM-DD')
                          ]
                        },
                        presence_setting_id: {
                          $not: ['8'] // LD
                        }
                      }
                    })
                    .then(found => {
                      if (found.length == 0) {
                        return presence_monthly
                          .create({
                            presence_period_id: result.period.id,
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
                            // if (result.employee.length == index + 1) {
                            //   callback(null, arr);
                            // }
                          });
                      } else {
                        console.log('No:', index + 1);
                        console.log('jumlah: ', found.length);
                        console.log('User ID: ', data.id);

                        return found.map((x, index2) => {
                          console.log('ID: ', x.id);

                          totalTime[data.id].push(x.total_time);
                          totalMinus[data.id].push(x.total_minus);
                          totalOver[data.id].push(x.total_over);
                          console.log('Total Time: ', totalTime[data.id]);
                          console.log('Total Over: ', totalOver[data.id]);
                          console.log('Total Minus: ', totalMinus[data.id]);

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

                            return true;
                          }

                          // if (result.employee.length == index + 1 && found.length == index2 + 1) {
                          //   callback(null, {
                          //     type: 'update',
                          //     data: arr,
                          //     period: result.period
                          //   });
                          // }
                        });
                      }
                    });
                })
              )
                .then(() => {
                  callback(null, {
                    type: 'update',
                    data: arr,
                    period: result.period
                  });
                })
                .catch(err => {
                  console.log('Error promise.all createMonthlyPresence', err);
                  callback({
                    code: 'ERR',
                    message: 'Error promise.all createMonthlyPresence',
                    data: err
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
            result.data.map((x, i) => {
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
                      presence_period_id: result.period.id,
                      user_id: x.user_id
                    }
                  }
                )
                .then(updated => {
                  return updated;
                })
                .catch(err => {
                  console.log('Error update updateMonthlyPresence', err);
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
              console.log('Error Promise.all updateMonthlyPresence');
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
  let { employee, schedule, device, branch, presence, presence_detail, presence_setting } = APP.models.company[
    req.user.db
  ].mysql;
  async.waterfall(
    [
      function checkBLEDevice(callback) {
        device
          .findOne({
            where: {
              // mac: req.body.mac
              mac: 'f9:55:60:6b:8b:59' //sementara pake ini aja
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
        employee
          .findOne({
            where: {
              id: req.user.id
            }
          })
          .then(user => {
            schedule
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
                } else {
                  // cek hari ini apakah hari kerja
                  let workDay = res.work_day;

                  workDay = workDay.filter(x => {
                    return x == moment().day();
                  });

                  if (workDay.length == 0) {
                    console.log('libur');

                    callback({
                      code: 'INVALID_REQUEST',
                      message: 'Hari ini bukan hari kerja!'
                    });
                  } else {
                    console.log('kerja');

                    callback(null, {
                      device: result,
                      schedule: res
                    });
                  }
                }
              });
          });
      },

      function checkBranchLocation(result, callback) {
        //lat long sementara
        let lat = -7.939259;
        let long = 112.632022;
        // 6371 radius bumi yang diukur dengan satuan kilometer
        APP.db.sequelize
          .query(
            `SELECT x.* FROM (
              SELECT
                id, name, radius, (
                  6371 * acos (
                    cos ( radians(${lat}) )
                    * cos( radians( latitude ) )
                    * cos( radians( longitude ) - radians(${long}) )
                    + sin ( radians(${lat}) )
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
        presence_setting.findAll().then(res => {
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
        let time = moment();
        let checkInStart = moment(result.schedule.check_in_start, 'HH:mm:ss');
        let checkInEnd = moment(result.schedule.check_in_end, 'HH:mm:ss');
        let checkOutStart = moment(result.schedule.check_out_start, 'HH:mm:ss');
        let checkOutEnd = moment(result.schedule.check_out_end, 'HH:mm:ss');

        console.log(time.format('HH:mm:ss'));
        console.log(result.branch);

        // check in
        if (time.isBetween(checkInStart, checkInEnd)) {
          presence
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
                    type: 'checkin',
                    updated: updated
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
          presence
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
                    type: 'checkout',
                    updated: updated
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
      },

      function uploadPath(result, callback) {
        try {
          if (result.type == 'checkin') {
            let images = [req.body.upload1, req.body.upload2, req.body.upload3];
            let fileName = `${moment().format('YYMMDD')}_checkin_image_`;
            let dir = `./public/uploads/company_${req.user.code}/employee/presence/${req.body.label}/`;

            if (!fs.existsSync(dir)) {
              mkdirp.sync(dir);
            }

            Promise.all(
              images.map((x, i) => {
                let base64Image = x.split(';base64,').pop();

                fs.writeFile(dir + `${fileName}${i + 1}.jpg`, base64Image, { encoding: 'base64' }, function(err) {
                  console.log('File created');
                });
                return dir + `${fileName}${i + 1}.jpg`;
              })
            ).then(arr => {
              callback(null, {
                type: result.type,
                updated: result.updated,
                path: arr
              });
            });
          } else {
            let images = [req.body.upload1, req.body.upload2, req.body.upload3];
            let fileName = `${moment().format('YYMMDD')}_checkout_image_`;
            let dir = `./public/uploads/company_${req.user.code}/employee/presence/${req.body.label}/`;

            if (!fs.existsSync(dir)) {
              mkdirp.sync(dir);
            }

            Promise.all(
              images.map((x, i) => {
                let base64Image = x.split(';base64,').pop();

                fs.writeFile(dir + `${fileName}${i + 1}.jpg`, base64Image, { encoding: 'base64' }, function(err) {
                  console.log('File created');
                });
                return dir + `${fileName}${i + 1}.jpg`;
              })
            ).then(arr => {
              callback(null, {
                type: result.type,
                updated: result.updated,
                path: arr
              });
            });
          }
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function createDetail(result, callback) {
        if (result.type == 'checkin') {
          presence_detail
            .create({
              presence_id: result.updated.id,
              employee_id: req.user.id,
              date: moment().format('YYYY-MM-DD'),
              latitude_checkin: req.body.lat,
              longitude_checkin: req.body.lng,
              image_checkin_a: result.path[0].slice(8),
              image_checkin_b: result.path[1].slice(8),
              image_checkin_c: result.path[2].slice(8)
            })
            .then(created => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'Berhasil melakukan Check In',
                data: {
                  presence: result.updated,
                  detail: created
                }
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        } else {
          presence_detail
            .update(
              {
                latitude_checkout: req.body.lat,
                longitude_checkout: req.body.lng,
                image_checkout_a: result.path[0].slice(8),
                image_checkout_b: result.path[1].slice(8),
                image_checkout_c: result.path[2].slice(8)
              },
              {
                where: {
                  presence_id: result.updated.id
                }
              }
            )
            .then(updated => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'Berhasil melakukan Check Out',
                data: updated
              });
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
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

exports.getHistoryCheckInOut = (APP, req, callback) => {
  let params = ` ORDER BY ${req.user.db}.presence.date DESC`;

  if (req.body.datestart && req.body.dateend) {
    params = ` WHERE ${req.user.db}.presence.date BETWEEN '${req.body.datestart}' AND '${req.body.dateend}' 
              ORDER BY ${req.user.db}.presence.date DESC`;
  }

  if (req.user.level === 3) {
    params = ` WHERE presence.user_id = ${req.user.id} ORDER BY ${req.user.db}.presence.date DESC`;
  }

  if (req.body.datestart && req.body.dateend && req.user.level === 3) {
    params = ` WHERE ${req.user.db}.presence.date BETWEEN '${req.body.datestart}' AND '${req.body.dateend}'
              AND presence.user_id = ${req.user.id} ORDER BY ${req.user.db}.presence.date DESC`;
  }

  let query = `SELECT 
                presence.id, presence.user_id, presence.check_in_device_id, 
                presence.check_out_device_id, presence.check_in_branch_id, 
                presence.check_out_branch_id, presence.date, presence.check_in, 
                presence.check_out, presence.total_time, presence.presence_setting_id, 
                detail.latitude_checkin AS 'check_in_latitude',
                detail.longitude_checkin AS 'check_in_longitude',
                detail.latitude_checkout AS 'check_out_latitude',
                detail.longitude_checkout AS 'check_out_longitude',
                detail.image_checkin_a AS 'check_in_image_a',
                detail.image_checkin_b AS 'check_in_image_b',
                detail.image_checkin_c AS 'check_in_image_c',
                detail.image_checkout_a AS 'check_out_image_a',
                detail.image_checkout_b AS 'check_out_image_b',
                detail.image_checkout_b AS 'check_out_image_c',
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
                check_out_branch.address AS 'check_out_branch_address',
                presence_setting.value AS 'presence_status_name',
                presence_setting.description AS 'presence_status_description'
              FROM 
                ${req.user.db}.presence AS presence 
              LEFT OUTER JOIN
              ${req.user.db}.presence_detail AS detail ON presence.id = detail.presence_id
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
              LEFT OUTER JOIN
                ${req.user.db}.presence_setting AS presence_setting ON presence.presence_setting_id = presence_setting.id  
              ${params}`;

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

exports.getSettingsCompany = (APP, req, callback) => {
  let { presence_setting_master } = APP.models.mysql;
  let { presence_setting } = APP.models.company[req.user.db].mysql;

  async.waterfall(
    [
      function getSettingsMaster(callback) {
        let arr = [];
        presence_setting_master
          .findAll()
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Presence Setting tidak ditemukan!'
              });
            } else {
              res.map(x => {
                arr.push(x.dataValues);
              });
              callback(null, arr);
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function getSettingsCompany(data, callback) {
        Promise.all(
          data.map((x, i) => {
            return presence_setting
              .findAll({
                where: {
                  presence_setting_id: x.id
                }
              })
              .then(res => {
                data[i].presence_settings = res;
                return true;
              });
          })
        )
          .then(() => {
            callback(null, {
              code: 'FOUND',
              message: 'Presence Setting Ditemukan!',
              data: data
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
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

exports.presenceSettings = (APP, req, callback) => {
  if (req.user.level === 1) {
    let { presence_setting_master } = APP.models.mysql;
    let { settings } = req.body;

    if (!settings || Array.isArray(settings) === false) {
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
    let { presence_setting } = APP.models.company[req.user.db].mysql;
    let { settings } = req.body;

    if (!settings || Array.isArray(settings) === false) {
      callback({
        code: 'INVALID_REQUEST',
        id: 'SPQ96',
        message: 'Kesalahan pada parameter'
      });
    } else {
      Promise.all(
        settings.map((x, index) => {
          return presence_setting
            .update(
              {
                value: x.value,
                description: x.desc
              },
              {
                where: {
                  id: x.id
                }
              }
            )
            .then(updated => {
              console.log(updated);
              return updated;
            });
        })
      )
        .then(arr => {
          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: 'SPP00',
            message: 'Setting presence berhasil diubah',
            data: arr
          });
        })
        .catch(err => {
          console.log(err);
          callback({
            code: 'ERR',
            id: '',
            message: 'Terjadi kesalahan, mohon coba kembali atau hubungi tim operasional kami',
            data: err
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
