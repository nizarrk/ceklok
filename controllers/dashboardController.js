'use strict';

const async = require('async');
const moment = require('moment');

exports.dashboardEmployee = (APP, req, callback) => {
  let { employee, presence_monthly, presence_setting, grade, job_title, schedule } = APP.models.company[
    req.user.db
  ].mysql;

  async.waterfall(
    [
      function getEmployeeInfo(callback) {
        employee.belongsTo(grade, {
          targetKey: 'id',
          foreignKey: 'grade_id'
        });

        employee.belongsTo(job_title, {
          targetKey: 'id',
          foreignKey: 'job_title_id'
        });

        employee.belongsTo(schedule, {
          targetKey: 'id',
          foreignKey: 'schedule_id'
        });

        employee
          .findOne({
            include: [
              {
                model: grade,
                attributes: ['name', 'description']
              },
              {
                model: job_title,
                attributes: ['name', 'description']
              },
              {
                model: schedule,
                attributes: ['name', 'description']
              }
            ],
            where: {
              id: req.user.id
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Employee tidak ditemukan'
              });
            }

            callback(null, res.dataValues);
          })
          .catch(err => {
            console.log('Error getEmployeeInfo', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getEmployeeInfo',
              data: err
            });
          });
      },

      function getPresenceMonthly(result, callback) {
        presence_monthly
          .findAll({
            where: {
              user_id: req.user.id
            },
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            // if (res == null) {
            //     return callback({
            //         code: 'NOT_FOUND',
            //         message: 'Presence Monthly tidak ditemukan'
            //     })
            // }

            callback(null, {
              employee: result,
              presence: res[0]
            });
          })
          .catch(err => {
            console.log('Error getPresenceMonthly', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getPresenceMonthly',
              data: err
            });
          });
      },

      function getLastCheckInOut(result, callback) {
        let today = moment().format('YYYY-MM-DD');

        APP.db.sequelize
          .query(
            `SELECT 
                  presence.id, presence.user_id, presence.check_in_device_id, 
                  presence.check_out_device_id, presence.check_in_branch_id, 
                  presence.check_out_branch_id, presence.date, presence.check_in, 
                  presence.check_out, presence.total_time, presence.presence_setting_id,
                  presence_setting.value AS 'presence_setting_name',
                  presence_setting.description AS 'presence_setting_description', 
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
              LEFT OUTER JOIN 
                  ${req.user.db}.presence_setting AS presence_setting ON presence.presence_setting_id = presence_setting.id
              WHERE  
                  ${req.user.db}.presence.date = '${today}'
              AND
                  ${req.user.db}.presence.user_id = ${req.user.id}
              ORDER BY 
                  ${req.user.db}.presence.id
              DESC LIMIT 1`
          )
          .then(res => {
            // if (res[0].length == 0) {
            //     return callback({
            //         code: 'NOT_FOUND',
            //         message: 'Presence kemarin tidak ditemukan'
            //     })
            // }

            callback(null, {
              code: 'OK',
              data: {
                employee: result.employee,
                presence: result.presence,
                yesterday: res[0]
              }
            });
          })
          .catch(err => {
            console.log('Error getLastCheckInOut', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getLastCheckInOut',
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

exports.dashboardEmployeePresenceDetail = (APP, req, callback) => {
  if (req.user.level === 3) {
    let { presence, presence_setting, presence_monthly } = APP.models.company[req.user.db].mysql;
    async.waterfall(
      [
        function getPresenceDaily(callback) {
          presence
            .findAndCountAll({
              where: {
                user_id: req.user.id
              },
              attributes: ['id', 'user_id', 'check_in', 'check_out', 'total_time']
            })
            .then(res => {
              callback(null, {
                code: 'OK',
                data: res
              });
            });
        }
      ],
      (err, result) => {
        if (err) return callback(err);

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

exports.dashboardAdminCompany = (APP, req, callback) => {
  console.log(req.user.db);

  let {
    employee,
    presence,
    presence_monthly,
    presence_setting,
    grade,
    job_title,
    schedule,
    feature_active
  } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function getTotalActiveFeature(callback) {
        feature_active
          .findAndCountAll()
          .then(res => {
            callback(null, res);
          })
          .catch(err => {
            console.log('Error getTotalActiveFeature', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getTotalActiveFeature',
              data: err
            });
          });
      },

      function getTotalEmployee(result, callback) {
        employee
          .findAndCountAll()
          .then(res => {
            callback(null, {
              feature: result,
              employee: res
            });
          })
          .catch(err => {
            console.log('Error getTotalEmployee', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getTotalEmployee',
              data: err
            });
          });
      },

      function getTotalGrading(result, callback) {
        grade
          .findAndCountAll()
          .then(res => {
            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: res
            });
          })
          .catch(err => {
            console.log('Error getTotalGrading', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getTotalGrading',
              data: err
            });
          });
      },

      function getTotalJobTitle(result, callback) {
        job_title
          .findAndCountAll()
          .then(res => {
            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: result.grade,
              job_title: res
            });
          })
          .catch(err => {
            console.log('Error getTotalJobTitle', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getTotalJobTitle',
              data: err
            });
          });
      },

      function getMostActiveEmployee(result, callback) {
        let arr = [];
        presence_monthly.belongsTo(employee, {
          targetKey: 'id',
          foreignKey: 'user_id'
        });
        presence_monthly
          .findAndCountAll({
            include: [
              {
                model: employee,
                attributes: ['id', 'nik', 'name']
              }
            ],
            limit: 5
          })
          .then(res => {
            res.rows.map((x, i) => {
              let obj = {};

              obj.user = x.employee.dataValues;
              obj.total_time = x.total_time;
              obj.dur_time = APP.time.timeToDuration(x.total_time);

              arr.push(obj);
            });

            arr.sort(function(a, b) {
              return b.dur_time - a.dur_time;
            });

            // let rank = 1;
            // for (let i = 0; i < arr.length; i++) {
            //   if (i > 0 && arr[i].dur_time < arr[i - 1].dur_time) {
            //     rank++;
            //   }
            //   arr[i].rank = rank;
            // }

            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: result.grade,
              job_title: result.job_title,
              most_active: arr
            });
          })
          .catch(err => {
            console.log('Error getMostActiveEmployee', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getMostActiveEmployee',
              data: err
            });
          });
      },

      function getMostUnderPerformedEmployee(result, callback) {
        let arr = [];
        presence_monthly.belongsTo(employee, {
          targetKey: 'id',
          foreignKey: 'user_id'
        });
        presence_monthly
          .findAndCountAll({
            include: [
              {
                model: employee,
                attributes: ['id', 'nik', 'name']
              }
            ],
            limit: 5
          })
          .then(res => {
            res.rows.map((x, i) => {
              let obj = {};

              obj.user = x.employee.dataValues;
              obj.total_minus = x.total_minus;
              obj.dur_minus = APP.time.timeToDuration(x.total_minus);

              arr.push(obj);
            });

            arr.sort(function(a, b) {
              return b.dur_minus - a.dur_minus;
            });

            // let rank = 1;
            // for (let i = 0; i < arr.length; i++) {
            //   if (i > 0 && arr[i].dur_minus < arr[i - 1].dur_minus) {
            //     rank++;
            //   }
            //   arr[i].rank = rank;
            // }

            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: result.grade,
              job_title: result.job_title,
              most_active: result.most_active,
              under_performed: arr
            });
          })
          .catch(err => {
            console.log('Error getMostUnderPerformedEmployee', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getMostUnderPerformedEmployee',
              data: err
            });
          });
      },

      function getlastCheckInOut(result, callback) {
        let arr = [];
        let arr2 = [];

        presence.belongsTo(employee, {
          targetKey: 'id',
          foreignKey: 'user_id'
        });

        presence
          .findAndCountAll({
            include: [
              {
                model: employee,
                attributes: ['id', 'nik', 'name']
              }
            ],
            where: {
              date: moment().format('YYYY-MM-DD')
            },
            limit: 1
          })
          .then(res => {
            res.rows.map((x, i) => {
              let obj = {};
              let obj2 = {};

              obj.user = x.employee.dataValues;
              obj.check_in = x.check_in;
              obj.date = x.date;
              obj.dur_checkin = APP.time.timeToDuration(x.check_in);
              obj2.user = x.employee.dataValues;
              obj2.check_out = x.check_out;
              obj2.date = x.date;
              obj2.dur_checkout = APP.time.timeToDuration(x.check_out);

              arr.push(obj);
              arr2.push(obj2);
            });

            arr.sort(function(a, b) {
              return b.dur_checkin - a.dur_checkin;
            });

            arr2.sort(function(a, b) {
              return b.dur_checkout - a.dur_checkout;
            });

            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: result.grade,
              job_title: result.job_title,
              most_active: result.most_active,
              under_performed: result.under_performed,
              last_check_in: arr,
              last_check_out: arr2
            });
          })
          .catch(err => {
            console.log('Error getlastCheckInOut', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getlastCheckInOut',
              data: err
            });
          });
      },

      function getYesterdayPresence(result, callback) {
        let arr = [];

        presence.belongsTo(employee, {
          targetKey: 'id',
          foreignKey: 'user_id'
        });

        presence.belongsTo(presence_setting, {
          targetKey: 'id',
          foreignKey: 'presence_setting_id'
        });

        presence
          .findAndCountAll({
            include: [
              {
                model: employee,
                attributes: ['id', 'nik', 'name']
              },
              {
                model: presence_setting,
                attributes: ['id', 'value', 'description']
              }
            ],
            where: {
              date: moment()
                .subtract(1, 'days')
                .format('YYYY-MM-DD')
            }
          })
          .then(res => {
            callback(null, {
              feature: result.feature,
              employee: result.employee,
              grade: result.grade,
              job_title: result.job_title,
              most_active: result.most_active,
              under_performed: result.under_performed,
              last_check_in: result.last_check_in,
              last_check_out: result.last_check_out,
              yesterday: res
            });
          })
          .catch(err => {
            console.log('Error getYesterdayPresence', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getYesterdayPresence',
              data: err
            });
          });
      },

      function countTodayPresence(result, callback) {
        presence.belongsTo(employee, {
          targetKey: 'id',
          foreignKey: 'user_id'
        });

        presence.belongsTo(presence_setting, {
          targetKey: 'id',
          foreignKey: 'presence_setting_id'
        });

        presence
          .findAndCountAll({
            include: [
              {
                model: employee,
                attributes: ['id', 'nik', 'name']
              },
              {
                model: presence_setting,
                attributes: ['id', 'value', 'description']
              }
            ],
            where: {
              date: moment().format('YYYY-MM-DD')
            }
          })
          .then(res => {
            let wa = 0;
            let nci = 0;
            let nco = 0;
            let hadir = 0;
            let cuti = 0;
            let absen = 0;
            let izin = 0;

            Promise.all(
              res.rows.map(x => {
                let obj = {};

                obj.hadir = x.presence_setting_id == 1 ? hadir++ : hadir; // H
                obj.nci = x.presence_setting_id == 2 ? nci++ : nci; // NCI
                obj.nco = x.presence_setting_id == 3 ? nco++ : nco; // NCO
                obj.wa = x.presence_setting_id == 4 ? wa++ : wa; // WA
                obj.absen = x.presence_setting_id == 5 ? absen++ : absen; // A
                obj.cuti = x.presence_setting_id == 7 ? cuti++ : cuti; // C
                obj.izin = x.presence_setting_id == 6 ? izin++ : izin; // I

                return obj;
              })
            )
              .then(arr => {
                callback(null, {
                  feature: result.feature,
                  employee: result.employee,
                  grade: result.grade,
                  job_title: result.job_title,
                  most_active: result.most_active,
                  under_performed: result.under_performed,
                  last_check_in: result.last_check_in,
                  last_check_out: result.last_check_out,
                  yesterday: result.yesterday,
                  today: arr[arr.length - 1]
                });
              })
              .catch(err => {
                console.log('Error countTodayPresence', err);
                callback({
                  code: 'ERR',
                  message: 'Error countTodayPresence',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error getYesterdayPresence', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getYesterdayPresence',
              data: err
            });
          });
      },

      function getMonthlyPresence(result, callback) {
        console.log(result.today);

        let hadir = 0;
        let cuti = 0;
        let absen = 0;
        let izin = 0;

        presence_monthly
          .findAndCountAll()
          .then(res => {
            Promise.all(
              res.rows.map(x => {
                hadir += x.total_present;
                cuti += x.total_cuti;
                absen += x.total_absent;
                izin += x.total_permission;

                let obj = {};

                obj.hadir = hadir;
                obj.absen = absen;
                obj.cuti = cuti;
                obj.izin = izin;
                obj.day = x.total_day;

                return obj;
              })
            )
              .then(arr => {
                callback(null, {
                  code: 'OK',
                  data: {
                    feature: result.feature,
                    employee: result.employee,
                    grade: result.grade,
                    job_title: result.job_title,
                    most_active: result.most_active,
                    under_performed: result.under_performed,
                    last_check_in: result.last_check_in,
                    last_check_out: result.last_check_out,
                    yesterday: result.yesterday,
                    today: result.today,
                    monthly: arr[arr.length - 1]
                  }
                });
              })
              .catch(err => {
                console.log('Error countTodayPresence', err);
                callback({
                  code: 'ERR',
                  message: 'Error countTodayPresence',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error getYesterdayPresence', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getYesterdayPresence',
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

exports.dashboardAdminCeklok = (APP, req, callback) => {
  let { company, payment, endpoint } = APP.models.mysql;

  async.waterfall(
    [
      function getTotalActiveCompany(callback) {
        company
          .findAndCountAll({
            where: {
              status: 1
            }
          })
          .then(res => {
            Promise.all(
              res.rows.map((x, i) => {
                let company = {
                  code: x.company_code,
                  id: x.id,
                  name: x.name
                };
                return company;
              })
            )
              .then(arr => {
                callback(null, {
                  total_company: res.count,
                  company: arr
                });
              })
              .catch(err => {
                console.log('Error getTotalActiveCompany', err);
                callback({
                  code: 'ERR',
                  message: '',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error getTotalActiveCompany', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error getTotalActiveCompany',
              data: err
            });
          });
      },

      function getTotalEmployee(result, callback) {
        let num = 0;

        Promise.all(
          result.company.map((x, i) => {
            return APP.models.company[`${process.env.MYSQL_NAME}_${x.code}`].mysql.employee
              .count()
              .then(res => {
                num += res;
                let obj = {
                  id: x.id,
                  company_code: x.code,
                  name: x.name,
                  total: num
                };

                return obj;
              })
              .catch(err => {
                console.log('Error getTotalEmployee', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error getTotalEmployee',
                  data: err
                });
              });
          })
        ).then(arr => {
          arr.sort((a, b) => {
            return b.total - a.total;
          });

          callback(null, {
            total_company: result.total_company,
            employee: {
              total: num,
              company: arr
            }
          });
        });
      },

      function getMostActiveCompanyTransaction(result, callback) {
        let num = 0;

        Promise.all(
          result.employee.company.map(x => {
            return payment
              .count({
                attributes: ['id', 'invoice', 'name', 'description'],
                where: {
                  company_id: x.id
                }
              })
              .then(res => {
                num += res;
                let obj = {
                  id: x.id,
                  company_code: x.company_code,
                  name: x.name,
                  total: num
                };

                return obj;
              })
              .catch(err => {
                console.log('Error getTopFiveCompanyTransaction', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: '?',
                  message: 'Kesalahan pada database',
                  data: err
                });
              });
          })
        ).then(arr => {
          arr.sort((a, b) => {
            return b.total - a.total;
          });

          // callback(null, {
          //   total_company: result.total_company,
          //   employee: result.employee.company,
          //   transaction: arr
          // });

          callback(null, {
            code: 'OK',
            data: {
              total_company: result.total_company,
              company_code: result.company_code,
              employee: result.employee,
              transaction: arr
            }
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

exports.dashboardAdminCeklokFeature = (APP, req, callback) => {
  let { _logs } = APP.models.mongo;
  let { endpoint } = APP.models.mysql;
  let arr = [];
  let count = {};
  let all = 0;
  endpoint
    .findAndCountAll({
      attributes: ['endpoint']
    })
    .then(res => {
      res.rows.map((x, i) => {
        arr.push(x.dataValues.endpoint);
      });

      Promise.all(
        arr.map((y, i) => {
          return _logs
            .count({
              endpoint: y
            })
            .then(logs => {
              console.log(logs);

              all += logs;
              count[arr[i]] = logs;

              return true;
            })
            .catch(err => {
              console.log('Error getFeatureUsage', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error getFeatureUsage',
                data: err
              });
            });
        })
      ).then(() => {
        callback(null, {
          code: 'OK',
          data: {
            feature_access: count,
            all_feature_usage: all
          }
        });
      });
    });
};
