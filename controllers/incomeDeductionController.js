'use strict';

const async = require('async');
const path = require('path');

exports.get = (APP, req, callback) => {
  let { income_deduction } = APP.models.company[req.user.db].mysql;

  income_deduction
    .findAll({
      where: {
        status: 1,
        type: req.body.type
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.getById = (APP, req, callback) => {
  if (!req.body.id) {
    return callback({
      code: 'INVALID_REQUEST',
      message: 'Kesalahan pada parameter id!'
    });
  }

  let { income_deduction } = APP.models.company[req.user.db].mysql;

  income_deduction
    .findOne({
      where: {
        id: req.body.id,
        status: 1
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.insert = (APP, req, callback) => {
  let { income_deduction } = APP.models.company[req.user.db].mysql;
  let { name, desc, percentage, nominal, type } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!name)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter name!'
          });

        if (!desc)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter desc!'
          });

        if (!percentage)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter percentage!'
          });

        if (!nominal)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter nominal!'
          });

        if (!type)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter type!'
          });

        callback(null, true);
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(income_deduction, 'ID');
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

      function createNew(data, callback) {
        income_deduction
          .create({
            code: data.code,
            name: name,
            description: desc,
            percentage: percentage,
            nominal: nominal,
            type: type,
            created_by: req.user.id
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: '',
              message: 'Income / Deduction berhasil ditambahkan!',
              data: res
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: 'APQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.update = (APP, req, callback) => {
  let { income_deduction } = APP.models.company[req.user.db].mysql;
  let { id, name, desc, percentage, nominal, type, status } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });

        if (!name)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter name!'
          });

        if (!desc)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter desc!'
          });

        if (!percentage)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter percentage!'
          });

        if (!nominal)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter nominal!'
          });

        if (!type)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter type!'
          });

        if (!status)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter status!'
          });

        callback(null, true);
      },

      function updatePayrollPayment(data, callback) {
        income_deduction
          .update(
            {
              name: name,
              description: desc,
              percentage: percentage,
              nominal: nominal,
              type: type,
              status: status,
              updated_at: new Date(),
              updated_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Income / Deduction berhasil diubah!',
              data: res
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.delete = function(APP, req, callback) {
  let { income_deduction } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
        if (req.body.id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Kesalahan pada parameter id'
          });
        }
      },

      function softDelete(data, callback) {
        income_deduction
          .update(
            {
              status: 0
            },
            {
              where: {
                id: req.body.id
              }
            }
          )
          .then(updated => {
            if (updated.length == 0)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Income / Deduction tidak ditemukan!'
              });

            callback(null, {
              code: 'DELETE_SUCCESS',
              id: '?',
              message: '',
              data: updated
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
};
