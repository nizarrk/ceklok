'use strict';

const async = require('async');
const moment = require('moment-business-days');
const trycatch = require('trycatch');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to get data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.absent
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
        data: err
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
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'ABS000';
        let kode = '';

        APP.models.company[req.user.db].mysql.absent
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              kode = pad.substring(0, pad.length - str.length) + str;

              callback(null, kode);
            } else {
              console.log('ada');
              console.log(res[0].code);

              let lastID = res[0].code;
              let replace = lastID.replace('ABS', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
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

      function checkAbsentType(result, callback) {
        APP.models.company[req.user.db].mysql.absent_type
          .findOne({
            where: {
              id: req.body.type
            }
          })
          .then(res => {
            if (res === null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Tipe absent tidak ditemukan.'
              });
            }
            if (res.type === 0) {
              callback(null, {
                kode: result,
                type: res.type
              });
            } else {
              callback(null, {
                kode: result,
                type: res.type
              });
            }
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
                callback(null, {
                  result,
                  schedule: {
                    days: res.work_day,
                    time: res.work_time
                  }
                });
              });
          });
      },

      function checkLamaAbsent(data, callback) {
        moment.updateLocale('us', {
          workingWeekdays: data.schedule.days
        });

        if (data.result.type == 1) {
          let date1 = moment(req.body.datestart);
          let date2 = moment(req.body.dateend);
          let diff = date2.diff(date1, 'days') + 1; // +1 biar hari pertama keitung cuti
          let listDate = [];
          let dateMove = new Date(date1);
          let strDate = req.body.datestart;

          while (strDate < req.body.dateend) {
            strDate = dateMove.toISOString().slice(0, 10);
            // listDate.push(strDate);
            dateMove.setDate(dateMove.getDate() + 1);
            let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

            if (!checkDay) {
              listDate.push(strDate);
            }
          }

          let work_skip = APP.time.timeXday(data.schedule.time, diff);

          return callback(null, {
            kode: data.result.kode,
            days: diff - listDate.length,
            type: data.result.type,
            time: work_skip
          });
        }

        if (data.result.type == 0) {
          let date = req.body.datestart;
          req.body.dateend = date;
          return callback(null, {
            kode: data.result.kode,
            days: 0,
            type: data.result.type,
            time: moment
              .utc(moment(req.body.timeend, 'HH:mm:ss').diff(moment(req.body.timestart, 'HH:mm:ss')))
              .format('HH:mm:ss')
          });
        } else {
          return callback({
            code: 'ERR',
            message: 'tipe absent tidak tersedia'
          });
        }
      },

      function checkTglAbsent(result, callback) {
        APP.db.sequelize
          .query(
            `SELECT * FROM ${req.user.db}.absent
            WHERE
              user_id = ${req.body.user} 
            AND
              '${req.body.datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.dateend}' <= date_format(date_end, '%Y-%m-%d')
            OR
              '${req.body.datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.datestart}' <= date_format(date_end, '%Y-%m-%d')
            OR
              '${req.body.dateend}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.dateend}' <= date_format(date_end, '%Y-%m-%d')`
          )
          .then(res => {
            if (res[0].length > 0) {
              return callback({
                code: 'ERR',
                message: 'Sudah pernah absen di tanggal ini'
              });
            } else {
              return callback(null, result);
            }
          })
          .catch(err => {
            console.log('2', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function uploadPath(data, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let docPath = `./public/uploads/company_${req.user.code}/employee/absen/`;

            // if (!fs.existsSync(docPath)) {
            //   mkdirp.sync(docPath);
            // }

            callback(null, {
              kode: data.kode,
              days: data.days,
              type: data.type,
              time: data.time,
              doc: req.files.doc_upload
                ? docPath + fileName + path.extname(req.files.doc_upload.name)
                : data.result.doc_upload
            });
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              data: err
            });
          }
        );
      },

      function insertAbsent(data, callback) {
        APP.models.company[req.user.db].mysql.absent
          .build({
            code: data.kode,
            absent_type_id: req.body.type,
            user_id: req.user.admin == true ? req.body.user : req.user.id,
            date_start: req.body.datestart,
            date_end: req.body.dateend,
            time_start: req.body.timestart,
            time_end: req.body.timeend,
            description: req.body.desc,
            count: data.days,
            time_total: data.time,
            upload: data.doc.slice(8) // slice 8 buat ngilangin './public'
          })
          .save()
          .then(result => {
            // upload file
            if (req.files.doc_upload) {
              req.files.doc_upload.mv(data.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
              data: result.dataValues || params
            });
          })
          .catch(err => {
            console.log('pas insert', err);

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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to update data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.update = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.absent
    .update(
      {
        status: req.body.status
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      if (!result || (result && !result[0])) {
        let params = 'No data updated'; //This is only example, Object can also be used
        return callback(null, {
          code: 'UPDATE_NONE',
          data: params
        });
      }

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
        data: err
      });
    });
};

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to delete data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.company[req.user.db].mysql.absent
    .destroy(params)
    .then(deleted => {
      if (!deleted)
        return callback(null, {
          code: 'DELETE_NONE',
          data: params.where
        });

      return callback(null, {
        code: 'DELETE_SUCCESS',
        data: params.where
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};
