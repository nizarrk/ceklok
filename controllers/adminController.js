'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');

exports.checkExistingEmailCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        email: req.body.company.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate email!'
          },
          info: {
            dataCount: res.length,
            parameter: 'email company'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'email company'
        }
      });
    })
    .catch(err => {
      console.log('iki error email company', err);
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        tlp: req.body.company.telp
      }
    })
    .then(res => {
      console.log(res);

      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate telp!'
          },
          info: {
            dataCount: res.length,
            parameter: 'telp company'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'telp company'
        }
      });
    })
    .catch(err => {
      console.log('iki error telp company', err);
      return callback({
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
        return callback({
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
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'email admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error email admin', err);
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpAdmin = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        tlp: req.body.admin.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
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
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
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
        user_name: req.body.admin.username
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          data: {
            row: 'Error! Duplicate username!'
          },
          info: {
            dataCount: res.length,
            parameter: 'username admin'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'username admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error username', err);
      return callback({
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
              console.log('iki error bcrypt', err);

              callback({
                code: 'ERR_DATABASE',
                data: JSON.stringify(err)
              });
            });
        } else {
          return callback(pass);
        }
      },

      function registerCompany(result, callback) {
        APP.models.mysql.company
          .build({
            pricing_id: req.body.company.pricing,
            name: req.body.company.name,
            address: req.body.company.address,
            kelurahan: req.body.company.kel,
            kecamatan: req.body.company.kec,
            city: req.body.company.city,
            province: req.body.company.prov,
            zipcode: req.body.company.zip,
            msisdn: 'default',
            tlp: req.body.company.telp,
            email: req.body.company.email,
            payment_status: 0
          })
          .save()
          .then(res => {
            callback(null, {
              pass: result,
              company: res
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
              data: JSON.stringify(err)
            });
          });
      },

      function registerAdmin(data, callback) {
        let email = APP.validation.email(req.body.admin.email);
        let username = APP.validation.username(req.body.admin.username);

        if (email && username) {
          APP.models.mysql.admin
            .build({
              company_id: data.company.id,
              name: req.body.admin.name,
              gender: req.body.admin.gender,
              pob: req.body.admin.pob,
              dob: req.body.admin.dob,
              address: req.body.admin.address,
              kelurahan: req.body.admin.kel,
              kecamatan: req.body.admin.kec,
              city: req.body.admin.city,
              province: req.body.admin.prov,
              zipcode: req.body.admin.zip,
              msisdn: 'default',
              tlp: req.body.admin.telp,
              email: req.body.admin.email,
              user_name: req.body.admin.username,
              password: data.pass
            })
            .save()
            .then(res => {
              callback(null, {
                admin: res,
                company: data.company
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
                data: JSON.stringify(err)
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function paymentUser(data, callback) {
        APP.models.mysql.payment
          .create({
            payment_method_id: req.body.payment.method,
            company_id: data.company.id,
            rek_name: req.body.payment.name,
            rek_no: req.body.payment.no,
            image: req.body.payment.iamge,
            status: 0
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
        APP.models.mysql.admin
          .findAll({
            where: {
              user_name: req.body.username
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

exports.verifyEmployee = (APP, req, callback) => {
  async.waterfall(
    [
      function generateEmployeeCode(callback) {
        let tgl = new Date().getDate().toString();
        let month = new Date().getMonth().toString();
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;
        let pad = '0000';

        APP.models.mysql.employee
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            console.log(res);

            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              let ans = pad.substring(0, pad.length - str.length) + str;

              let kode = req.body.company + '-' + time + '-' + ans;

              callback(null, kode);
            } else {
              console.log('ada');
              let lastID = res[0].dataValues.id_karyawan;
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

      function updateEmployee(result, callback) {
        APP.models.mysql.employee
          .findOne({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            res
              .update({
                employee_code: result,
                role_id: req.body.role,
                grade_id: req.body.grade,
                status: req.body.status
              })
              .then(result => {
                APP.mailer.sendMail({
                  subject: 'Account Verified',
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
