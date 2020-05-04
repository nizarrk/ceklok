'use strict';

const async = require('async');

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to get data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.department
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
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getById = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.department
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Department tidak ditemukan!'
        });
      }

      callback(null, {
        code: 'FOUND',
        data: rows
      });
    })
    .catch(err => {
      console.log(err);

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
  let { department } = APP.models.company[req.user.db].mysql;
  let { name, desc, loc } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (name && desc && loc) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateDepartmentCode(result, callback) {
        let kode = APP.generateCode(department, 'DEP');
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

      function insertDepartment(result, callback) {
        department
          .build({
            code: result.code,
            name: name,
            description: desc,
            location: loc,
            action_by: req.user.id
          })
          .save()
          .then(result => {
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
              data: result.dataValues || params,
              message: 'Department berhasil ditambahkan!'
            });
          })
          .catch(err => {
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
  if (req.body.name && req.body.desc && req.body.loc && req.body.status) {
    APP.models.company[req.user.db].mysql.department
      .update(
        {
          name: req.body.name,
          description: req.body.desc,
          location: req.body.loc,
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
          data: result,
          message: 'Department berhasil diupdate!'
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
  } else {
    callback({
      code: 'INVALID_REQUEST',
      message: 'Kesalahan pada parameter!'
    });
  }
};

exports.updateStatus = function(APP, req, callback) {
  if (req.body.id && req.body.status) {
    if (req.body.status == '0' || req.body.status == '1') {
      APP.models.company[req.user.db].mysql.department
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
            data: result,
            message: 'Department berhasil diupdate!'
          });
        })
        .catch(err => {
          console.log('iki error', err);

          if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
            let params = 'Error! Empty Query'; //This is only example, Object can also be used
            return callback({
              code: 'UPDATE_NONE',
              data: err
            });
          }

          if (err.original && err.original.code === 'ER_DUP_ENTRY') {
            let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
            return callback({
              code: 'DUPLICATE',
              data: err
            });
          }

          return callback({
            code: 'ERR_DATABASE',
            data: err
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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to delete data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.delete = function(APP, req, callback) {
  let { employee, department } = APP.models.company[req.user.db].mysql;
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

      function checkEmployeeDepartment(data, callback) {
        employee
          .findAll({
            where: {
              department_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan department ini!'
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

      function deleteDepartment(data, callback) {
        department
          .destroy({
            where: {
              id: req.body.id
            }
          })
          .then(deleted => {
            // if (!deleted)
            //   return callback(null, {
            //     code: 'DELETE_NONE',
            //     data: params.where
            //   });

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
