'use strict';

const bcrypt = require('bcrypt');
const async = require('async');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const trycatch = require('trycatch');
const key = require('../config/jwt-key.json');
const jwt = require('jsonwebtoken');

exports.addSuperAdmin = (APP, req, callback) => {
  APP.models.mysql.admin_app
    .create({
      name: req.body.name,
      email: req.body.email,
      user_name: req.body.username,
      password: bcrypt.hashSync(req.body.pass, 10)
    })
    .then(res => {
      callback(null, {
        code: 'INSERT_SUCCESS'
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
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

        // if (!req.body.platform)
        //   return callback({
        //     code: 'MISSING_KEY',
        //     data: req.body,
        //     info: {
        //       missingParameter: 'platform'
        //     }
        //   });

        // if (req.body.platform != 'Web')
        //   return callback({
        //     code: 'INVALID_KEY',
        //     data: req.body,
        //     info: {
        //       invalidParameter: 'platform'
        //     }
        //   });

        callback(null, true);
      },

      function checkSuperAdmin(index, callback) {
        APP.models.mysql.admin_app
          .findAll({
            where: {
              user_name: req.body.username
            }
          })
          .then(rows => {
            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'No records found'
              });
            }

            callback(null, rows);
          })
          .catch(err => {
            console.log(err);

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
            if (res === true) return callback(null, rows);

            callback({
              code: 'INVALID_PASSWORD',
              message: 'password did not match'
            });
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
            id: rows[0].id,
            superadmin: true
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_super_admin: rows[0].id
            // platform: req.body.platform
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
                    data: err
                  });
                });
            } else {
              console.log('iki insert');

              APP.models.mongo.token
                .create({
                  id_super_admin: rows[0].id,
                  // platform: req.body.platform,
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

exports.verifyCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function verifyCredentials(callback) {
        if (req.user.superadmin) {
          APP.models.mysql.admin_app
            .findOne({
              where: {
                id: req.user.id
              }
            })
            .then(res => {
              if (bcrypt.compareSync(req.body.pass, res.password)) {
                return callback(null, true);
              } else {
                return callback({
                  code: 'ERR',
                  message: 'Invalid Password!'
                });
              }
            })
            .catch(err => {
              console.log('Error function verifyCredentials', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error function verifyCredentials',
                data: err
              });
            });
        } else {
          callback({
            code: 'ERR',
            message: 'Your account is not super admin'
          });
        }
      },

      function uploadPath(result, callback) {
        if (!req.files || Object.keys(req.files).length === 0) {
          return callback({
            code: 'ERR',
            id: 'PVS01',
            message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
          });
        }

        let fileName = new Date().toISOString().replace(/:|\./g, '');
        let imagePath = './public/uploads/payment/company/';

        // if (!fs.existsSync(imagePath)) {
        //   mkdirp.sync(imagePath);
        // }

        callback(null, {
          result: result,
          path: imagePath + fileName + path.extname(req.files.image.name)
        });
      },

      function updatePaymentStatus(data, callback) {
        APP.models.mysql.payment
          .findOne({
            where: { invoice: req.body.invoice }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Invoice tidak ditemukan'
              });
            }

            if (res.status === 1) {
              return callback({
                code: 'UPDATE_NONE',
                message: 'Payment have already verified!'
              });
            }

            if (res.image === null) {
              return callback({
                code: 'UPDATE_NONE',
                message: 'Company have not verify their payment!'
              });
            }

            res
              .update({
                status: 1,
                image_admin: data.path.slice(8)
              })
              .then(result => {
                // Use the mv() method to place the file somewhere on your server
                req.files.image.mv(result, function(err) {
                  if (err) {
                    console.log(err);

                    return callback({
                      code: 'ERR',
                      id: 'PVS01',
                      message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                    });
                  }
                });
                callback(null, result.dataValues);
              })
              .catch(err => {
                console.log('Error function updatePaymentStatus', err);

                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function generateCompanyCode(result, callback) {
        let tgl = new Date().getDate().toString();
        if (tgl.length == 1) {
          tgl = '0' + new Date().getDate().toString();
        }
        let month = new Date().getMonth() + 1;
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;

        APP.models.mysql.company
          .findOne({
            where: {
              id: result.company_id
            }
          })
          .then(res => {
            let array = res.name.split(' ');
            let code = '';

            array.map(res => {
              code += res[0].toUpperCase();
            });

            let companyCode = code + time + '0'; // 0 is numbering index
            APP.models.mysql.company
              .findAll({
                where: {
                  company_code: {
                    $like: `${code + time}%`
                  }
                },
                limit: 1,
                order: [['id', 'DESC']]
              })
              .then(res => {
                if (res.length == 0) {
                  callback(null, {
                    payment: result,
                    companyCode
                  });
                } else {
                  let lastID = res[0].company_code;
                  let replace = lastID.replace(code + time, '');
                  let num = parseInt(replace) + 1;

                  companyCode = code + time + num;

                  callback(null, {
                    payment: result,
                    companyCode
                  });
                }
              })
              .catch(err => console.log(err));
          });
      },

      function updateCompany(data, callback) {
        APP.models.mysql.company
          .findOne({
            where: {
              id: data.payment.company_id
            }
          })
          .then(res => {
            res
              .update({
                company_code: data.companyCode,
                payment_status: 1
              })
              .then(result => {
                callback(null, { payment: data.payment, company: result, code: data.companyCode });
              })
              .catch(err => {
                console.log('1', err);

                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('2', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function updateAdmin(data, callback) {
        APP.models.mysql.admin
          .findOne({
            where: {
              company_id: data.payment.company_id
            }
          })
          .then(res => {
            res
              .update({
                company_code: data.code,
                status: 1
              })
              .then(result => {
                callback(null, {
                  payment: data.payment,
                  company: data.company,
                  admin: result
                });
              })
              .catch(err => {
                console.log('1', err);

                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('2', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function sendEmail(data, callback) {
        // add payment_method and pricing to payment
        APP.models.mysql.payment.belongsTo(APP.models.mysql.payment_method, {
          targetKey: 'id',
          foreignKey: 'payment_method_id'
        });
        APP.models.mysql.payment.belongsTo(APP.models.mysql.pricing, {
          targetKey: 'id',
          foreignKey: 'pricing_id'
        });

        APP.models.mysql.payment
          .findOne({
            include: [
              {
                model: APP.models.mysql.payment_method
              },
              {
                model: APP.models.mysql.pricing
              }
            ],
            where: {
              id: data.payment.id
            }
          })
          .then(res => {
            //send to email
            APP.mailer.sendMail({
              subject: 'Company Verified',
              to: data.company.email,
              data: {
                payment: res,
                company: data.company
              },
              file: 'verify_company.html'
            });

            callback(null, {
              payment: res,
              company: data.company
            });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function createCompanyDB(data, callback) {
        let dbName = 'ceklok_' + data.company.company_code;

        APP.db.sequelize
          .query(`CREATE DATABASE ${dbName}`)
          .then(() => {
            callback(null, { dbName, data });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function createTable(data, callback) {
        fs.readdir(path.join(__dirname, '../models/template'), (err, files) => {
          if (err) {
            console.log(err);
            return callback({
              code: 'ERR',
              data: err
            });
          }

          let models = {};
          let x = [];
          let n = 1;
          let len = files.length;

          files.map(file => {
            let tableName = file.replace('.js', '');
            x.push(file);
            APP.db.sequelize
              .query(`CREATE TABLE ${data.dbName}.${tableName} LIKE ${process.env.MYSQL_NAME}.${tableName}`)
              .then(() => {
                x.map(model => {
                  let Model = APP.db
                    .customSequelize(data.dbName)
                    .import(path.join(__dirname, '../models/template/', model));
                  let modelName = model.replace('.js', '');

                  models[modelName] = Model;

                  if (n === len) {
                    let mysqls = {};

                    Object.keys(models).forEach(val => {
                      if (models[val].associate) models[val].associate(models);

                      mysqls[val] = models[val];
                    });
                  }

                  n++;
                });
              });
          });
        });
        return callback(null, {
          code: 'UPDATE_SUCCESS',
          data: {
            data
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
