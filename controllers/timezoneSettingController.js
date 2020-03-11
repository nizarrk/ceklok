'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  APP.models[req.user.db].mysql.timezone_setting
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

exports.insert = function(APP, req, callback) {
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'TZS000';
        let kode = '';

        APP.models.company[req.user.db].mysql.timezone_setting
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
              let replace = lastID.replace('TZS', '');
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

      function getTimezone(result, callback) {
        APP.models.mysql.timezone
          .findOne({
            where: {
              id: req.body.timezoneid
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Timezone tidak ditemukan!'
              });
            }

            callback(null, {
              kode: result,
              timezone: res
            });
          });
      },

      function insertSetting(result, callback) {
        APP.models.company[req.user.db].mysql.timezone_setting
          .build({
            code: result.kode,
            timezone_id: result.timezone.id,
            country_code: result.timezone.country_code,
            timezone: result.timezone.timezone,
            gmt_offset: result.timezone.gmt_offset
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

exports.update = function(APP, req, callback) {
  async.waterfall(
    [
      function getTimezone(callback) {
        APP.models.mysql.timezone
          .findOne({
            where: {
              id: req.body.timezoneid
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Timezone tidak ditemukan!'
              });
            }

            callback(null, res);
          });
      },

      function insertSetting(result, callback) {
        APP.models.company[req.user.db].mysql.timezone_setting
          .update(
            {
              timezone_id: result.id,
              country_code: result.country_code,
              timezone: result.timezone,
              gmt_offset: result.gmt_offset
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

exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.company[req.user.db].mysql.timezone_setting
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