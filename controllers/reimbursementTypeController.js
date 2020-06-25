'use strict';

const async = require('async');

exports.get = (APP, req, callback) => {
  let { reimbursement_type } = APP.models.company[req.user.db].mysql;

  reimbursement_type
    .findAll({
      where: {
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
  let { reimbursement_type } = APP.models.company[req.user.db].mysql;
  let { name, desc } = req.body;

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

        callback(null, true);
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(reimbursement_type, 'RT');
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

      function createNewType(data, callback) {
        reimbursement_type
          .create({
            code: data.code,
            name: name,
            description: desc,
            action_by: req.user.id
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Service berhasil ditambahkan!',
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

exports.update = (APP, req, callback) => {
  let { reimbursement_type } = APP.models.company[req.user.db].mysql;
  let { id, name, desc, status } = req.body;

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

        if (!status)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter status!'
          });

        callback(null, true);
      },

      function updatereimbursement_type(data, callback) {
        reimbursement_type
          .update(
            {
              name: name,
              description: desc,
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
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Service berhasil diubah!',
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
  let { reimbursement_type } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
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

      // function checkreimbursement_typeRequest(data, callback) {
      //   reimbursement_type_request
      //     .findAll({
      //       where: {
      //         reimbursement_type_id: req.body.id,
      //         status: {
      //             $not: "0"
      //         }
      //       }
      //     })
      //     .then(res => {
      //       if (res.length == 0) {
      //         callback(null, true);
      //       } else {
      //         callback({
      //           code: 'INVALID_REQUEST',
      //           id: '',
      //           message: 'Terdapat request aktif sedang mengunakan reimbursement_type ini!'
      //         });
      //       }
      //     })
      //     .catch(err => {
      //       console.log(err);
      //       callback({
      //         code: 'ERR_DATABASE',
      //         id: '?',
      //         message: '?',
      //         data: err
      //       });
      //     });
      // },

      function softDeletereimbursement_type(data, callback) {
        reimbursement_type
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
                message: 'reimbursement_type tidak ditemukan!'
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
