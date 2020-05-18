'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.status_contract
    .findAll()
    .then(rows => {
      callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getById = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.status_contract
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      callback(null, {
        code: rows !== null ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.insert = function(APP, req, callback) {
  let { status_contract } = APP.models.company[req.user.db].mysql;
  let { name, desc, setting, cuti } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (name && desc && setting && cuti) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(status_contract, 'ES');
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

      function insertEmployeeStatus(result, callback) {
        APP.models.company[req.user.db].mysql.status_contract
          .build({
            code: result.code,
            name: name,
            description: desc,
            leave_setting: setting,
            leave_permission: cuti
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

exports.update = function(APP, req, callback) {
  let { name, desc, id, status, setting, cuti } = req.body;
  let { status_contract } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
        if (name && desc && id && status && setting && cuti) {
          if (status == '1' || (status == '0' && setting == '1') || setting == '0') {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter status atau setting!'
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
        status_contract
          .update(
            {
              name: name,
              description: desc,
              leave_setting: setting,
              leave_permission: cuti,
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
            //   return callback({
            //     code: 'INVALID_REQUEST',
            //     message: 'Status contract tidak ditemukan!'
            //   });
            // }

            callback(null, {
              code: 'UPDATE_SUCCESS',
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

exports.updateStatus = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.status_contract
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
        data: err
      });
    });
};

exports.delete = function(APP, req, callback) {
  let { employee, status_contract } = APP.models.company[req.user.db].mysql;
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

      function checkEmployeeStatusContract(data, callback) {
        employee
          .findAll({
            where: {
              status_contract_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan grading ini!'
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

      function deleteStatusContract(data, callback) {
        status_contract
          .destroy({
            where: {
              id: req.body.id
            }
          })
          .then(deleted => {
            if (!deleted)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Status Contract tidak ditemukan!'
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
};
