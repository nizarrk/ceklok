'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.job_title
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

exports.getById = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.job_title
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Data tidak ditemukan'
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
        data: err
      });
    });
};

exports.insert = function(APP, req, callback) {
  let { job_title } = APP.models.company[req.user.db].mysql;
  let { name, desc } = req.body;
  async.waterfall(
    [
      function checkbody(callback) {
        if (name && desc) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(job_title, 'JT');
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

      function insertJobTitle(result, callback) {
        job_title
          .build({
            code: result.code,
            name: name,
            description: desc
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
  if (req.body.name && req.body.desc && req.body.id && req.body.status) {
    APP.models.company[req.user.db].mysql.job_title
      .update(
        {
          name: req.body.name,
          description: req.body.desc,
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
  } else {
    callback({
      code: 'INVALID_REQUEST',
      message: 'Kesalahan pada parameter!'
    });
  }
};

exports.updateStatus = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.job_title
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
};

exports.delete = function(APP, req, callback) {
  let { employee, job_title } = APP.models.company[req.user.db].mysql;
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

      function checkEmployeeJobTitle(data, callback) {
        employee
          .findAll({
            where: {
              job_title_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan job title ini!'
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

      function deleteJobTitle(data, callback) {
        job_title
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
