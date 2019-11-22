'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');

exports.checkExistingTelp = (APP, req, callback) => {
  APP.models.mysql.karyawan
    .findAll({
      where: {
        telp: req.body.telp
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: {
          row: res && res.length > 0 ? APP.rsa.encrypt(res) : []
        },
        info: {
          dataCount: res.length,
          parameter: 'telp'
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingEmail = (APP, req, callback) => {
  APP.models.mysql.karyawan
    .findAll({
      where: {
        email: req.body.email
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: {
          row: res && res.length > 0 ? APP.rsa.encrypt(res) : []
        },
        info: {
          dataCount: res.length,
          parameter: 'email'
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingUsername = (APP, req, callback) => {
  APP.models.mysql.karyawan
    .findAll({
      where: {
        username: req.body.username
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: {
          row: res && res.length > 0 ? APP.rsa.encrypt(res) : []
        },
        info: {
          dataCount: res.length,
          parameter: 'username'
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.register = (APP, req, callback) => {
  console.log(req.body);

  async.waterfall(
    [
      function encryptPassword(callback) {
        let pass = APP.validation.password(req.body.pass);
        if (pass === true) {
          bcrypt.hash(req.body.pass, 10).then(hashed => {
            return callback(null, hashed);
          });
        } else {
          return callback(pass);
        }
      },

      function registerUser(hashed, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email == true && username == true) {
          console.log(req.body);
          APP.models.mysql.karyawan
            .build({
              nama: req.body.nama,
              email: req.body.email,
              code_company: req.body.company,
              username: req.body.username,
              telp: req.body.telp,
              password: hashed
            })
            .save()
            .then(result => {
              let params = 'Insert Success'; //This is only example, Object can also be used
              return callback(null, {
                code: 'INSERT_SUCCESS',
                data: APP.rsa.encrypt(result.dataValues || params)
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
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      }
    ],
    (err, result) => {
      console.log('oi');

      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.login = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        if (!req.body.username)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'username'
            }
          });

        if (!req.body.pass)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'password'
            }
          });

        if (!req.body.platform)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'platform'
            }
          });

        callback(null, true);
      },

      function checkUser(index, callback) {
        APP.models.mysql.karyawan
          .findAll({
            where: {
              username: req.body.username
            }
          })
          .then(rows => {
            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                info: {
                  parameter: 'No records found'
                }
              });
            }
            callback(null, rows);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function commparePassword(rows, callback) {
        bcrypt
          .compare(req.body.pass, rows[0].password)
          .then(res => {
            if (res === true) return callback(null, rows);

            callback({
              code: 'INVALID_PASSWORD',
              info: {
                parameter: 'password did not match'
              }
            });
          })
          .catch(err => {
            callback({
              code: 'ERR_BCRYPT',
              data: JSON.stringify(err)
            });
          });
      },

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows[0].id
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_user: rows[0].id,
            platform: req.body.platform
          })
          .then(res => {
            if (res !== null) {
              console.log('iki update');

              APP.models.mongo.token
                .findByIdAndUpdate(res._id, {
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(res => {
                  return callback(null, {
                    code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                    data: {
                      row: APP.rsa.encrypt(rows[0].dataValues),
                      token
                    },
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
            } else {
              console.log('iki insert');

              APP.models.mongo.token
                .create({
                  id_user: rows[0].id,
                  platform: req.body.platform,
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(result => {
                  return callback(null, {
                    code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                    data: {
                      row: APP.rsa.encrypt(rows[0]),
                      token
                    },
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
            }
          });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.logout = (APP, req, callback) => {
  APP.models.mongo.token
    .findOneAndDelete({
      token: req.headers.authorization
    })
    .then(res => {
      callback(null, {
        code: 'FOUND',
        data: {
          row: APP.rsa.encrypt(res)
        },
        info: {
          dataCount: res.length
        }
      });
    })
    .catch(err => {
      callback({
        code: 'NOT_FOUND',
        data: JSON.stringify(err)
      });
    });
};
