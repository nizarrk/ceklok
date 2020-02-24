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
          .findOne({
            where: {
              user_id: req.user.id
            }
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
              presence: res
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
        let yesterday = moment()
          .subtract(1, 'days')
          .format('YYYY-MM-DD');

        APP.db.sequelize
          .query(
            `SELECT 
                  presence.id, presence.user_id, presence.check_in_device_id, 
                  presence.check_out_device_id, presence.check_in_branch_id, 
                  presence.check_out_branch_id, presence.date, presence.check_in, 
                  presence.check_out, presence.total_time, presence.presence_setting_id,
                  presence_setting.name AS 'presence_setting_name',
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
                  ${req.user.db}.presence.date = '${yesterday}' 
              AND
                  ${req.user.db}.presence.user_id = ${req.user.id}`
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

exports.dashboardAdminCompany = (APP, req, callback) => {
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
            ]
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
            ]
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
            }
          })
          .then(res => {
            res.rows.map((x, i) => {
              let obj = {};
              let obj2 = {};

              obj.user = x.employee.dataValues;
              obj.check_in = x.check_in;
              obj.dur_checkin = APP.time.timeToDuration(x.check_in);
              obj2.user = x.employee.dataValues;
              obj2.check_out = x.check_out;
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
                attributes: ['id', 'name', 'description']
              }
            ],
            where: {
              date: moment()
                .subtract(3, 'days')
                .format('YYYY-MM-DD')
            }
          })
          .then(res => {
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
                yesterday: res.rows
              }
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
