'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const fs = require('fs');

const generateEmployeeCode = async (APP, req, index) => {
  let tgl = new Date().getDate().toString();
  if (tgl.length == 1) {
    tgl = '0' + new Date().getDate().toString();
  }
  let month = (new Date().getMonth() + 1).toString();
  if (month.length == 1) {
    month = '0' + month;
  }
  let year = new Date()
    .getFullYear()
    .toString()
    .slice(2, 4);
  let time = year + month + tgl;
  let pad = '0000';
  let kode = '';
  let add = 1;

  if (index) {
    add = index;
  }

  let res = await APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee.findAll({
    limit: 1,
    order: [['id', 'DESC']]
  });

  if (res.length == 0) {
    console.log('kosong');
    let str = '' + 1;

    kode = req.body.company + '-' + time + str;

    return kode;
  } else {
    console.log('ada');
    let lastID = res[0].employee_code;
    let replace = lastID.replace(req.body.company + '-', '');
    let lastNum = replace.charAt(replace.length - 1);

    let num = parseInt(lastNum) + add;

    kode = req.body.company + '-' + time + num;

    return kode;
  }
};

exports.checkExistingTelp = (APP, req, callback) => {
  APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
    .findAll({
      where: {
        tlp: req.body.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          message: 'Error! Duplicate telp!',
          info: {
            dataCount: res.length,
            parameter: 'telp'
          }
        });
      } else {
        callback(null, {
          code: 'NOT_FOUND',
          info: {
            dataCount: res.length,
            parameter: 'telp'
          }
        });
      }
    })
    .catch(err => {
      console.log('iki error telp', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.checkExistingEmail = (APP, req, callback) => {
  APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
    .findAll({
      where: {
        email: req.body.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        callback({
          code: 'DUPLICATE',
          message: 'Error! Duplicate Email!'
        });
      } else {
        callback(null, {
          code: 'NOT_FOUND',
          info: {
            dataCount: res.length,
            parameter: 'email'
          }
        });
      }
    })
    .catch(err => {
      console.log('iki error email', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.checkExistingUsername = (APP, req, callback) => {
  APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
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
          message: 'Error! Duplicate Username!',
          info: {
            dataCount: res.length,
            parameter: 'username'
          }
        });
      } else {
        callback(null, {
          code: 'NOT_FOUND',
          info: {
            dataCount: res.length,
            parameter: 'username'
          }
        });
      }
    })
    .catch(err => {
      console.log('iki error username', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.checkExistingCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        company_code: req.body.company ? req.body.company : ''
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback(null, {
          code: 'FOUND',
          data: res
        });
      }
      callback({
        code: 'NOT_FOUND',
        message: 'Company tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error company', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
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

      function generateCode(result, callback) {
        let code = new Promise((resolve, reject) => {
          resolve(generateEmployeeCode(APP, req));
        });

        code
          .then(res => {
            callback(null, res);
          })
          .catch(err => {
            callback({
              code: 'ERR',
              data: err
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
                data: err
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
          APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
            .build({
              employee_code: data.kode,
              company_code: req.body.company,
              nik: req.body.nik,
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
              photo: 'default.jpg',
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
                data: err
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      }
    ],
    (err, result) => {
      if (err) {
        console.log(err);

        return callback(err);
      }

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
            message: 'Missing key, company'
          });

        if (!req.body.username)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, username'
          });

        if (!req.body.pass)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, password'
          });

        if (!req.body.platform)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, platform'
          });

        if (req.body.platform != 'Web' && req.body.platform != 'Mobile')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            message: 'Missing key, platform'
          });

        callback(null, true);
      },

      function checkUser(index, callback) {
        APP.models.company[process.env.MYSQL_NAME + '_' + req.body.company.toUpperCase()].mysql.employee
          .findAll({
            attributes: ['id', 'company_code', 'user_name', 'password', 'photo', 'initial_login'],
            where: {
              user_name: req.body.username,
              company_code: req.body.company
            }
          })
          .then(rows => {
            if (rows.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Invalid Username or Password'
              });
            } else {
              if (rows[0].status == 0) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'User have to wait for admin to verify their account first!'
                });
              } else {
                callback(null, rows);
              }
            }
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function commparePassword(rows, callback) {
        bcrypt
          .compare(req.body.pass, rows[0].password)
          .then(res => {
            if (res === true) {
              callback(null, {
                id: rows[0].id,
                company_code: rows[0].company_code,
                user_name: rows[0].user_name,
                photo: rows[0].photo,
                initial_login: rows[0].initial_login
              });
            } else {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Invalid Username or Password'
              });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows.id,
            code: rows.company_code,
            db: `${process.env.MYSQL_NAME}_${rows.company_code}`,
            grade: rows.grade_id,
            level: 3,
            admin: false
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_user: rows.id,
            company_code: rows.company_code,
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
                .then(() => {
                  callback(null, {
                    code: 'UPDATE_SUCCESS',
                    data: {
                      row: rows,
                      token
                    },
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
            } else {
              console.log('iki insert');

              APP.models.mongo.token
                .create({
                  id_user: rows.id,
                  platform: req.body.platform,
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(() => {
                  callback(null, {
                    code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                    data:
                      rows && rows.length > 0
                        ? {
                            row: rows,
                            token
                          }
                        : null,
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
  let query;
  async.waterfall(
    [
      function checkLevel(callback) {
        if (req.body.level == 1) {
          query = APP.models.mysql.admin_app;
          callback(null, true);
        } else if (req.body.level == 2) {
          query = APP.models.mysql.admin;
          callback(null, true);
        } else if (req.body.level == 3) {
          query = APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee;
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '',
            message: 'Invalid User Level'
          });
        }
      },

      function checkCompany(data, callback) {
        if (req.body.level == 3) {
          module.exports.checkExistingCompany(APP, req, callback);
        } else {
          callback(null, true);
        }
      },

      function checkEmail(data, callback) {
        query
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
            console.log('Error checkEmail', err);

            callback({
              code: 'ERR_DATABASE',
              message: 'Error checkEmail',
              data: err
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
              // dimatiin dulu by request
              // if (res.date.getTime() === req.currentDate.getTime() && res.count >= 3) {
              //   return callback({
              //     code: 'INVALID_REQUEST',
              //     message: 'Limit reached for today!'
              //   });
              // }
              if (res.date.getTime() !== req.currentDate.getTime() || res.count <= 3) {
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
                  })
                  .catch(err => {
                    console.log('Error update createOTP', err);
                    callback({
                      code: 'ERR_DATABASE',
                      message: 'Error update createOTP',
                      data: err
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
                })
                .catch(err => {
                  console.log('Error insert createOTP', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error insert createOTP',
                    data: err
                  });
                });
            }
          });
      },

      function sendEmail(data, callback) {
        try {
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
        } catch (err) {
          console.log('Error sendMail', err);
          callback({
            code: 'ERR',
            message: 'Error sendMail'
          });
        }
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
      email: req.body.email,
      otp: req.body.otp
    })
    .then(res => {
      if (res == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Kode OTP salah atau tidak ditemukan'
        });
      }
      callback(null, {
        code: 'FOUND',
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

exports.resetPassword = (APP, req, callback) => {
  console.log(req.body);

  let query;
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
            code: 'INVALID_REQUEST',
            message: 'Invalid password confirm'
          });
        }
        callback(null, true);
      },

      function checkLevel(data, callback) {
        if (req.body.level == 1) {
          query = APP.models.mysql.admin_app;
          callback(null, true);
        } else if (req.body.level == 2) {
          query = APP.models.mysql.admin;
          callback(null, true);
        } else if (req.body.level == 3) {
          query = APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee;
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '',
            message: 'Invalid User Level'
          });
        }
      },

      function checkCompany(data, callback) {
        if (req.body.level == 3) {
          module.exports.checkExistingCompany(APP, req, callback);
        } else {
          callback(null, true);
        }
      },

      function checkPassword(data, callback) {
        query
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
                code: 'INVALID_REQUEST',
                message: 'Password is match with previous password!'
              });
            });
          })
          .catch(err => {
            console.log('Error checkPassword', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error checkPassword',
              data: err
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
        query
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
                console.log('Error update updatePassword', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error update updatePassword',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error findOne updatePassword', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error findOne updatePassword',
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

exports.logout = (APP, req, callback) => {
  APP.models.mongo.token
    .findOneAndDelete({
      token: req.headers.authorization
    })
    .then(res => {
      if (res == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Token login tidak ditemukan'
        });
      }

      callback(null, {
        code: 'FOUND',
        message: 'Token login ditemukan dan berhasil dihapus',
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
