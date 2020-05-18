'use strict';

const async = require('async');
const moment = require('moment');

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to get data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.getById = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.schedule
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      return callback(null, {
        code: rows !== null ? 'FOUND' : 'NOT_FOUND',
        data: rows
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.schedule
    .findAll()
    .then(rows => {
      return callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to insert data to MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.insert = function(APP, req, callback) {
  let { name, desc, checkin_start, checkin_end, checkout_start, checkout_end, work, day } = req.body;
  let { schedule } = APP.models.company[req.user.db].mysql;

  async.waterfall(
    [
      function checkBody(callback) {
        if (name && desc && checkin_start && checkin_end && checkout_start && checkout_end && work && day) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(schedule, 'S');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: '?',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function hitungJamKerja(result, callback) {
        //jadikan array int
        let numDay = [];
        let splited = day.split(',');

        splited.map(x => {
          let num = parseInt(x);
          numDay.push(num);
        });

        callback(null, {
          code: result.code,
          week: APP.time.timeXday(work, numDay.length)
        });
      },

      function insertSchedule(result, callback) {
        APP.models.company[req.user.db].mysql.schedule
          .build({
            code: result.code,
            name: name,
            description: desc,
            check_in_start: checkin_start,
            check_in_end: checkin_end,
            check_out_start: checkout_start,
            check_out_end: checkout_end,
            work_time: work,
            break_time: req.body.break,
            weekly_work_time: result.week,
            work_day: day
          })
          .save()
          .then(result => {
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
              data: result.dataValues || params
            });
          })
          .catch(err => {
            console.log(err);

            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                data: params
              });
            }

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                data: params
              });
            }

            return callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to update data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.update = function(APP, req, callback) {
  let { name, desc, checkin_start, checkin_end, checkout_start, checkout_end, work, day, id, status } = req.body;
  let { schedule } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
        if (
          name &&
          desc &&
          checkin_start &&
          checkin_end &&
          checkout_start &&
          checkout_end &&
          work &&
          day &&
          id &&
          status
        ) {
          if (status == '1' || status == '0') {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter status!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function hitungJamKerja(result, callback) {
        //jadikan array int
        let numDay = [];
        let splited = day.split(',');

        splited.map(x => {
          let num = parseInt(x);
          numDay.push(num);
        });

        callback(null, {
          week: APP.time.timeXday(work, numDay.length)
        });
      },

      function update(data, callback) {
        schedule
          .update(
            {
              name: name,
              description: desc,
              check_in_start: checkin_start,
              check_in_end: checkin_end,
              check_out_start: checkout_start,
              check_out_end: checkout_end,
              work_time: work,
              break_time: req.body.break,
              weekly_work_time: data.week,
              work_day: day,
              status: status,
              updated_at: new Date(),
              action_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(result => {
            // if (!result || (result && !result[0])) {
            //   let params = 'No data updated'; //This is only example, Object can also be used
            //   return callback(null, {
            //     code: 'UPDATE_NONE',
            //     data: params
            //   });
            // }

            let params = 'Update Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'UPDATE_SUCCESS',
              data: params
            });
          })
          .catch(err => {
            console.log('iki error', err);

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                data: params
              });
            }

            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                data: params
              });
            }

            return callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to delete data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.delete = function(APP, req, callback) {
  let { employee, schedule } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkParam(callback) {
        if (req.user.level === 2) {
          if (req.body.id) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: '?',
              message: 'Kesalahan pada parameter id'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid User level'
          });
        }
      },

      function checkEmployeeSchecdule(data, callback) {
        employee
          .findAll({
            where: {
              schedule_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan shift type ini!'
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: '?',
              data: err
            });
          });
      },

      function deleteSchedule(data, callback) {
        schedule
          .destroy({
            where: {
              id: req.body.id
            }
          })
          .then(deleted => {
            if (!deleted)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Shift type tidak ditemukan!'
              });

            callback(null, {
              code: 'DELETE_SUCCESS',
              id: '?',
              message: '',
              data: deleted
            });
          })
          .catch(err => {
            return callback({
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
  let params = {
    where: {
      id: req.body.id
    }
  };
};
