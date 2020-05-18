'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.absent_type
    .findAll()
    .then(rows => {
      return callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.getById = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.absent_type
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows == null) {
        callback({
          code: 'NOT_FOUND'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          data: rows
        });
      }
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.insert = function(APP, req, callback) {
  let { absent_type } = APP.models.company[req.user.db].mysql;
  let { name, desc, type, cut } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (name && desc && type && cut) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(absent_type, 'AT');
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

      function insertAbsentType(result, callback) {
        APP.models.company[req.user.db].mysql.absent_type
          .build({
            code: result.code,
            name: name,
            description: desc,
            type: type,
            type_cut: cut,
            action_by: req.user.id
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
  let { status, type, cut, name, desc, id } = req.body;
  let { absent_type } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
        if (status && type && cut && name && desc && id) {
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

      function update(data, callback) {
        absent_type
          .update(
            {
              name: name,
              type: type,
              type_cut: cut,
              description: desc,
              updated_at: new Date(),
              status: status,
              action_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(result => {
            let params = 'Update Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'UPDATE_SUCCESS',
              message: params,
              data: result
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

exports.updateStatus = function(APP, req, callback) {
  if (req.body.status && req.body.id) {
    if (req.body.status == '0' || req.body.status == '1') {
      APP.models.company[req.user.db].mysql.absent_type
        .update(
          {
            status: req.body.status,
            updated_at: new Date(),
            action_by: req.user.id
          },
          {
            where: {
              id: req.body.id
            }
          }
        )
        .then(result => {
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
};

exports.delete = function(APP, req, callback) {
  let { absent_type, absent_cuti } = APP.models.company[req.user.db].mysql;
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

      function checkEmployeeAbsentCuti(data, callback) {
        absent_cuti
          .findAll({
            where: {
              absent_cuti_type_id: req.body.id,
              type: 0
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan tipe absen ini!'
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

      function deleteAbsentType(data, callback) {
        let params = {
          where: {
            id: req.body.id
          }
        };
        absent_type
          .destroy(params)
          .then(deleted => {
            if (!deleted)
              return callback(null, {
                code: 'INVALID_REQUEST',
                message: 'Absent Type tidak ditemukan!'
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
