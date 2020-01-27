'use strict';

const async = require('async');
const moment = require('moment');
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
  APP.models.company[req.user.db].mysql.cuti
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

exports.getLamaCutiKhusus = (APP, req, callback) => {
  APP.models.company[req.user.db].mysql.cuti_type
    .findOne({
      where: {
        id: req.body.cuti
      }
    })
    .then(res => {
      if (res.type == 1) {
        let exceptionDate = [];
        let dateStart = moment(req.body.start).format('YYYY-MM-DD');
        let dateEnd = moment(dateStart)
          .add(res.days - 1, 'days')
          .format('YYYY-MM-DD');
        let dateMove = new Date(dateStart);
        let strDate = dateStart;

        while (strDate < dateEnd) {
          let strDate = dateMove.toISOString().slice(0, 10);
          let exceptionDay = new Date(strDate);
          dateMove.setDate(dateMove.getDate() + 1);
          if (exceptionDay.getDay() == 6 || exceptionDay.getDay() == 0) {
            exceptionDate.push(exceptionDay);
          }
        }

        console.log(exceptionDate.length);
        dateEnd = moment(dateEnd)
          .add(exceptionDate.length, 'days')
          .format('YYYY-MM-DD');
      }
    })
    .catch(err => {
      console.log(err);
    });
};

exports.insert = function(APP, req, callback) {
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'CT-000';
        let kode = '';

        APP.models.company[req.user.db].mysql.cuti
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
              let replace = lastID.replace('CT-', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
            }
          })
          .catch(err => {
            console.log('1', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function checkCutiType(result, callback) {
        APP.models.company[req.user.db].mysql.cuti_type
          .findOne({
            where: {
              id: req.body.cuti
            }
          })
          .then(res => {
            if (res === null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Cuti khusus tidak ditemukan.'
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
                days: res.days,
                type: res.type
              });
            }
          });
      },

      function checkTglCuti(result, callback) {
        APP.db.sequelize
          .query(
            `SELECT * FROM ${req.user.db}.cuti
            WHERE
              user_id = ${req.body.user} 
            AND
              '${req.body.start}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.end}' <= date_format(date_end, '%Y-%m-%d')
            OR
              '${req.body.start}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.start}' <= date_format(date_end, '%Y-%m-%d')
            OR
              '${req.body.end}' >= date_format(date_start, '%Y-%m-%d') AND '${req.body.end}' <= date_format(date_end, '%Y-%m-%d')`
          )
          .then(res => {
            if (res[0].length > 0) {
              return callback({
                code: 'ERR',
                message: 'Sudah pernah cuti di tanggal ini'
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

      function checkLamaCuti(result, callback) {
        let date1 = new Date(req.body.start);
        let date2 = new Date(req.body.end);
        let diffTime = Math.abs(date2 - date1);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (result.type == 0) {
          return callback(null, {
            kode: result.kode,
            days: diffDays,
            type: result.type
          });
        }

        if (diffDays == result.days) {
          return callback(null, result);
        } else {
          return callback({
            code: 'ERR',
            message: 'Lama cuti khusus tidak sesuai.'
          });
        }
      },

      function uploadPath(result, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let docPath = `./public/uploads/company_${req.user.code}/employee/cuti/`;

            if (!fs.existsSync(docPath)) {
              mkdirp.sync(docPath);
            }

            callback(null, {
              kode: result.kode,
              days: result.days,
              type: result.type,
              doc: req.files.doc_upload
                ? docPath + fileName + path.extname(req.files.doc_upload.name)
                : result.doc_upload
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

      function insertCuti(data, callback) {
        APP.models.company[req.user.db].mysql.cuti
          .build({
            user_id: req.body.user,
            code: data.kode,
            cuti_type_id: req.body.cuti,
            date_start: req.body.start,
            date_end: req.body.end,
            total: req.body.total,
            left: req.body.left,
            period: req.body.period,
            count: data.days,
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
              data: result.dataValues,
              type: data.type
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
      },

      function updateSisaCuti(data, callback) {
        if (data.type !== 0) {
          callback(null, {
            code: 'INSERT_SUCCESS',
            data: data.data
          });
        } else {
          APP.models.company[req.user.db].mysql.employee
            .findOne({
              where: {
                id: 8
              }
            })
            .then(res => {
              res
                .update({
                  total_cuti: res.total_cuti - data.count
                })
                .then(result => {
                  callback(null, {
                    code: 'INSERT_SUCCESS',
                    data: data.data
                  });
                })
                .catch(err => {
                  console.log('error update');

                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('error find');

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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to update data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.update = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.cuti
    .update(
      {
        name: req.body.name,
        description: req.body.desc,
        location: req.body.loc
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
        data: JSON.stringify(err)
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
  APP.models.company[req.user.db].mysql.cuti
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
        data: JSON.stringify(err)
      });
    });
};
