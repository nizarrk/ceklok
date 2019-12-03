'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');

exports.checkExistingEmailCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        email_company: req.body.company.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate email!'
          },
          info: {
            dataCount: res.length,
            parameter: 'email'
          }
        });
      }
      callback(null, {
        code: 'NOT_FOUND',
        data: {
          row: []
        },
        info: {
          dataCount: res.length,
          parameter: 'email'
        }
      });
    })
    .catch(err => {
      console.log('iki error email company', err);
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        telp_company: req.body.company.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate telp!'
          },
          info: {
            dataCount: res.length,
            parameter: 'telp'
          }
        });
      }
      callback(null, {
        code: 'NOT_FOUND',
        data: {
          row: []
        },
        info: {
          dataCount: res.length,
          parameter: 'telp'
        }
      });
    })
    .catch(err => {
      console.log('iki error telp company', err);
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingEmailAdmin = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        email: req.body.admin.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate email!'
          },
          info: {
            dataCount: res.length,
            parameter: 'email admin'
          }
        });
      }
      callback(null, {
        code: 'NOT_FOUND',
        data: {
          row: []
        },
        info: {
          dataCount: res.length,
          parameter: 'email admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error email admin', err);
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpAdmin = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        telp: req.body.admin.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate telp!'
          },
          info: {
            dataCount: res.length,
            parameter: 'telp admin'
          }
        });
      }
      callback(null, {
        code: 'NOT_FOUND',
        data: {
          row: []
        },
        info: {
          dataCount: res.length,
          parameter: 'telp admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error telp admin', err);
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingUsername = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        username: req.body.admin.username
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate username!'
          },
          info: {
            dataCount: res.length,
            parameter: 'username'
          }
        });
      }
      callback(null, {
        code: 'NOT_FOUND',
        data: {
          row: []
        },
        info: {
          dataCount: res.length,
          parameter: 'username'
        }
      });
    })
    .catch(err => {
      console.log('iki error username', err);
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingCredentialsCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function checkTelp(callback) {
        module.exports.checkExistingTelpCompany(APP, req, callback);
      },

      function checkEmail(result, callback) {
        module.exports.checkExistingEmailCompany(APP, req, callback);
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.checkExistingCredentialsAdmin = (APP, req, callback) => {
  async.waterfall(
    [
      function checkUsername(callback) {
        module.exports.checkExistingUsername(APP, req, callback);
      },

      function checkTelp(result, callback) {
        module.exports.checkExistingTelpAdmin(APP, req, callback);
      },

      function checkEmail(result, callback) {
        module.exports.checkExistingEmailAdmin(APP, req, callback);
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.register = (APP, req, callback) => {
  async.waterfall(
    [
      function checkCredentialsAdmin(callback) {
        module.exports.checkExistingCredentialsAdmin(APP, req, callback);
      },

      function checkCredentialsCompany(result, callback) {
        module.exports.checkExistingCredentialsCompany(APP, req, callback);
      },

      function encryptPassword(result, callback) {
        let pass = APP.validation.password(req.body.admin.pass);
        if (pass === true) {
          bcrypt
            .hash(req.body.admin.pass, 10)
            .then(hashed => {
              return callback(null, hashed);
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
                data: JSON.stringify(err)
              });
            });
        } else {
          return callback(pass);
        }
      },

      function registerAdmin(hashed, callback) {
        let email = APP.validation.email(req.body.admin.email);
        let username = APP.validation.username(req.body.admin.username);

        if (email && username) {
          APP.models.mysql.admin
            .build({
              nama: req.body.admin.nama,
              jenis_kelamin: req.body.admin.jk,
              umur: req.body.admin.umur,
              alamat: req.body.admin.alamat,
              telp: req.body.admin.telp,
              email: req.body.admin.email,
              username: req.body.admin.username,
              password: hashed,
              status: 'Pending'
            })
            .save()
            .then(result => {
              callback(null, result);
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
                data: JSON.stringify(err)
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function registerCompany(result, callback) {
        APP.models.mysql.company
          .build({
            id_pricing: req.body.company.pricing,
            nama_company: req.body.company.nama,
            alamat_company: req.body.company.alamat,
            telp_company: req.body.company.telp,
            email_company: req.body.company.email,
            payment_status: 'Pending'
          })
          .save()
          .then(res => {
            callback(null, { admin: result, company: res });
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
              data: JSON.stringify(err)
            });
          });
      },

      function paymentUser(data, callback) {
        APP.models.mysql.payment
          .create({
            id_payment_method: req.body.payment.method,
            id_company: data.company.id,
            nama_rek: req.body.payment.nama,
            no_rek: req.body.payment.no,
            bukti: req.body.payment.bukti,
            status: 'Waiting'
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: {
                admin: data.admin.dataValues,
                company: data.company.dataValues,
                payment: res.dataValues
              }
            });
          })
          .catch(err => {
            callback({
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

        if (req.body.platform != 'Web')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            info: {
              invalidParameter: 'platform'
            }
          });

        callback(null, true);
      },

      function checkUser(index, callback) {
        APP.models.mysql.company
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
            id_admin: rows[0].id,
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
                    code: 'UPDATE_SUCCESS',
                    data: {
                      row: rows[0].dataValues,
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
                  id_admin: rows[0].id,
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
                      row: rows[0],
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

exports.verifikasiKaryawan = (APP, req, callback) => {
  APP.models.mysql.karyawan
    .findOne({
      where: {
        email: req.body.email
      }
    })
    .then(res => {
      res
        .update({
          role: req.body.role,
          grade: req.body.grade,
          status: 'Aktif'
        })
        .then(result => {
          APP.mailer.sendMail({
            subject: 'Verify Account',
            to: req.body.email,
            text: `Your account has been verrified. You're assigned as ${req.body.role} at ${req.body.grade}`
          });
          callback(null, {
            code: 'UPDATE_SUCCESS',
            data: result
          });
        })
        .catch(err => {
          callback({
            code: 'ERR_DATABASE',
            data: JSON.stringify(err)
          });
        });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.saveCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .create({
      id_admin: req.body.company,
      nama: req.body.nama,
      alamat: req.body.alamat,
      pricing: req.body.price,
      payment: req.body.payment
    })
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};
