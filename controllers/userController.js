'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const dbName = 'ceklok_VST1912090';

exports.checkExistingTelp = (APP, req, callback) => {
  APP.models.company[dbName].mysql.employee
    .findAll({
      where: {
        tlp: req.body.telp
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
      console.log('iki error telp', err);

      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingEmail = (APP, req, callback) => {
  APP.models.company[dbName].mysql.employee
    .findAll({
      where: {
        email: req.body.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate Email!'
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
      console.log('iki error email', err);

      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingUsername = (APP, req, callback) => {
  APP.models.company[dbName].mysql.employee
    .findAll({
      where: {
        company_code: req.body.company,
        user_name: req.body.username
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate Username!'
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

exports.checkExistingCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        company_code: req.body.company
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback(null, {
          code: 'FOUND',
          data: {
            row: res
          },
          info: {
            dataCount: res.length
          }
        });
      }
      callback({
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'email'
        }
      });
    })
    .catch(err => {
      console.log('iki error company', err);

      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingCredentials = (APP, req, callback) => {
  async.waterfall(
    [
      function checkUsername(callback) {
        module.exports.checkExistingUsername(APP, req, callback);
      },

      function checkTelp(result, callback) {
        module.exports.checkExistingTelp(APP, req, callback);
      },

      function checkEmail(result, callback) {
        module.exports.checkExistingEmail(APP, req, callback);
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
      function checkCredentials(callback) {
        module.exports.checkExistingCredentials(APP, req, callback);
      },

      function generateEmployeeCode(result, callback) {
        let tgl = new Date().getDate().toString();
        let month = new Date().getMonth().toString();
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;
        let pad = '0000';

        APP.models.company[dbName].mysql.employee
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              let ans = pad.substring(0, pad.length - str.length) + str;

              let kode = req.body.company + '-' + time + '-' + ans;

              callback(null, kode);
            } else {
              console.log('ada');
              let lastID = res[0].employee_code;
              let replace = lastID.replace(req.body.company + '-' + time + '-', '');

              let str = '' + parseInt(replace) + 1;
              let ans = pad.substring(0, pad.length - str.length) + str;

              let kode = req.body.company + '-' + time + '-' + ans;

              callback(null, kode);
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function encryptPassword(result, callback) {
        let pass = APP.validation.password(req.body.pass);
        if (pass === true) {
          bcrypt
            .hash(req.body.pass, 10)
            .then(hashed => {
              return callback(null, {
                kode: result,
                pass: hashed
              });
            })
            .catch(err => {
              callback({
                code: 'ERR_BCRYPT',
                data: JSON.stringify(err)
              });
            });
        } else {
          return callback(pass);
        }
      },

      function registerUser(data, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email && username) {
          APP.models.company[dbName].mysql.employee
            .build({
              employee_code: data.kode,
              company_code: req.body.company,
              name: req.body.name,
              gender: req.body.gender,
              pob: req.body.pob,
              dob: req.body.dob,
              address: req.body.address,
              kelurahan: req.body.kel,
              kecamatan: req.body.kec,
              city: req.body.city,
              province: req.body.prov,
              zipcode: req.body.zip,
              msisdn: 'default',
              tlp: req.body.telp,
              email: req.body.email,
              user_name: req.body.username,
              password: data.pass,
              old_password: data.pass
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
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
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
        if (!req.body.company)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'company'
            }
          });

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

        if (req.body.platform != 'Web' && req.body.platform != 'Mobile')
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
        APP.models.company[dbName].mysql.employee
          .findAll({
            where: {
              user_name: req.body.username,
              company_code: req.body.company
            }
          })
          .then(rows => {
            console.log(rows);

            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                info: {
                  parameter: 'No records found'
                }
              });
            }

            if (rows[0].status == 0) {
              return callback({
                code: 'VERIFICATION_NEEDED',
                info: {
                  parameter: 'User have to wait for admin to verify their account first.'
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
              code: 'ERR',
              data: JSON.stringify(err)
            });
          });
      },

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows[0].id,
            code: rows[0].company_code,
            db: `ceklok_${rows[0].company_code}`,
            admin: false
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_user: rows[0].id,
            company_code: rows[0].company_code,
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
                    data:
                      rows && rows.length > 0
                        ? {
                            row: rows[0].dataValues,
                            token
                          }
                        : null,
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

exports.forgotPassword = (APP, req, callback) => {
  async.waterfall(
    [
      function checkEmail(callback) {
        APP.models.company[dbName].mysql.employee
          .findAll({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            if (res.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                info: {
                  parameter: 'No records found'
                }
              });
            }
            callback(null, true);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function createOTP(result, callback) {
        let otp = APP.otp.generateOTP();

        APP.models.mongo.otp
          .findOne({
            email: req.body.email
          })
          .then(res => {
            if (res != null) {
              if (res.date.getTime() === req.currentDate.getTime() && res.count >= 3) {
                return callback({
                  code: 'ERR',
                  message: 'Limit reached for today!'
                });
              }
              if (res.date.getTime() !== req.currentDate.getTime() || res.count < 3) {
                APP.models.mongo.otp
                  .findByIdAndUpdate(res._id, {
                    otp: otp,
                    count: res.count == 3 ? 1 : res.count + 1,
                    date: req.currentDate,
                    time: req.customTime,
                    elapsed_time: req.elapsedTime || '0'
                  })
                  .then(result => {
                    callback(null, {
                      code: 'UPDATE_SUCCESS',
                      data: {
                        row: result,
                        otp: otp
                      },
                      info: {
                        dataCount: result.length
                      }
                    });
                  });
              }
            } else {
              APP.models.mongo.otp
                .create({
                  email: req.body.email,
                  otp: otp,
                  count: 1,
                  endpoint: req.originalUrl,
                  date: req.currentDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(res => {
                  callback(null, {
                    code: 'INSERT_SUCCESS',
                    data: {
                      row: res,
                      otp: otp
                    },
                    info: {
                      dataCount: res.length
                    }
                  });
                });
            }
          });
      },

      function sendEmail(data, callback) {
        console.log(data.data.row.otp);

        //send to email
        APP.mailer.sendMail({
          subject: 'Reset Password',
          to: req.body.email,
          data: {
            otp: data.data.otp
          },
          file: 'forgot_password.html'
        });

        callback(null, {
          code: data.code,
          data: data.data
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.checkOTP = (APP, req, callback) => {
  APP.models.mongo.otp
    .findOne({
      otp: req.body.otp
    })
    .then(res => {
      callback(null, {
        code: res != null ? 'FOUND' : 'NOT_FOUND',
        data:
          res != null
            ? {
                row: res
              }
            : null,
        info: {
          dataCount: res.length,
          parameter: 'otp'
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

exports.resetPassword = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        let password = APP.validation.password(req.body.pass);
        let konfirm = APP.validation.password(req.body.konf);

        if (password != true) {
          return callback(password);
        }

        if (konfirm != true) {
          console.log('konfirm');

          return callback(konfirm);
        }

        if (req.body.konf !== req.body.pass) {
          callback({
            code: 'NOT_MATCH',
            info: {
              parameter: 'konfirmasi password'
            }
          });
        }
        callback(null, true);
      },

      function checkPassword(result, callback) {
        APP.models.company[dbName].mysql.employee
          .findOne({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            bcrypt.compare(req.body.pass, res.password).then(res => {
              console.log(res);

              if (res === false) return callback(null, true);

              callback({
                code: 'INVALID_PASSWORD',
                message: 'Password is match with previous password!'
              });
            });
          });
      },

      function encryptPassword(result, callback) {
        let pass = APP.validation.password(req.body.pass);
        if (pass === true) {
          bcrypt.hash(req.body.pass, 10).then(hashed => {
            callback(null, hashed);
          });
        } else {
          callback(pass);
        }
      },

      function updatePassword(result, callback) {
        APP.models.company[dbName].mysql.employee
          .findOne({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                data: null
              });
            }
            res
              .update({
                password: result,
                updated_at: new Date()
              })
              .then(res => {
                callback(null, {
                  code: 'UPDATE_SUCCESS',
                  data: res
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
        code: res != null ? 'FOUND' : 'NOT_FOUND',
        data:
          res != null
            ? {
                row: res
              }
            : null,
        info: {
          dataCount: res.length
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
