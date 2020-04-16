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
            message: 'Missing key, username!'
          });

        if (!req.body.pass)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, password!'
          });

        if (!req.body.platform)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, platform'
          });

        if (req.body.platform != 'Web')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            message: 'Invalid key, username'
          });

        callback(null, true);
      },

      function checkSuperAdmin(index, callback) {
        APP.models.mysql.admin_app
          .findAll({
            attributes: ['id', 'name', 'password', 'photo', 'initial_login', 'status'],
            where: {
              user_name: req.body.username
            }
          })
          .then(rows => {
            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Invalid Username or Password'
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
            if (res === true) {
              callback(null, {
                id: rows[0].id,
                name: rows[0].name,
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
            level: 1,
            superadmin: true
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_admin_ceklok: rows.id
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
                      row: rows,
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
                  id_admin_ceklok: rows.id,
                  // platform: req.body.platform,
                  token,
                  platform: req.body.platform,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(() => {
                  return callback(null, {
                    code: rows !== null ? 'FOUND' : 'NOT_FOUND',
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
  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function verifyCredentials(callback) {
          if (req.user.level === 1) {
            APP.models.mysql.admin_app
              .findOne(
                {
                  where: {
                    id: req.user.id
                  }
                },
                { transaction: t }
              )
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
              code: 'INVALiD_REQUEST',
              message: 'Your account is not super admin'
            });
          }
        },

        function uploadPath(result, callback) {
          try {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                id: 'PVS01',
                message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let imagePath = './public/uploads/payment/company/';

            callback(null, {
              result: result,
              path: imagePath + fileName + path.extname(req.files.image.name)
            });
          } catch (err) {
            console.log('Error uploadPath', err);
            callback({
              code: 'ERR',
              id: 'PVS01',
              message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi',
              data: err
            });
          }
        },

        function updatePaymentStatus(data, callback) {
          APP.models.mysql.payment
            .findOne(
              {
                where: { invoice: req.body.invoice }
              },
              { transaction: t }
            )
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
                .update(
                  {
                    status: 1,
                    image_admin: data.path.slice(8)
                  },
                  { transaction: t }
                )
                .then(result => {
                  // Use the mv() method to place the file somewhere on your server
                  req.files.image.mv(data.path, function(err) {
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
            .findOne(
              {
                where: {
                  id: result.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              let array = res.name.split(' ');
              let code = '';

              array.map(res => {
                code += res[0].toUpperCase();
              });

              let companyCode = code + time + '0'; // 0 is numbering index
              APP.models.mysql.company
                .findAll(
                  {
                    where: {
                      company_code: {
                        $like: `${code + time}%`
                      }
                    },
                    limit: 1,
                    order: [['id', 'DESC']]
                  },
                  { transaction: t }
                )
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
                .catch(err => {
                  console.log('Error generateCompanyCode', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            });
        },

        function updateCompany(data, callback) {
          APP.models.mysql.company
            .findOne(
              {
                where: {
                  id: data.payment.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              res
                .update(
                  {
                    company_code: data.companyCode,
                    payment_status: 1,
                    status: 1
                  },
                  { transaction: t }
                )
                .then(result => {
                  callback(null, { payment: data.payment, company: result, code: data.companyCode });
                })
                .catch(err => {
                  console.log('Error update updateCompany', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findone updateCompany', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function updateAdmin(data, callback) {
          APP.models.mysql.admin
            .findOne(
              {
                where: {
                  company_id: data.payment.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              res
                .update(
                  {
                    company_code: data.code,
                    status: 1
                  },
                  { transaction: t }
                )
                .then(result => {
                  callback(null, {
                    payment: data.payment,
                    company: data.company,
                    admin: result
                  });
                })
                .catch(err => {
                  console.log('Error update updateAdmin', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findone updateAdmin', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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
          APP.models.mysql.payment_detail.belongsTo(APP.models.mysql.pricing, {
            targetKey: 'id',
            foreignKey: 'item_id'
          });

          APP.models.mysql.payment.hasMany(APP.models.mysql.payment_detail, {
            sourceKey: 'id',
            foreignKey: 'payment_id'
          });

          APP.models.mysql.payment
            .findOne(
              {
                include: [
                  {
                    model: APP.models.mysql.payment_method
                  },
                  {
                    model: APP.models.mysql.payment_detail,
                    include: [
                      {
                        model: APP.models.mysql.pricing
                      }
                    ]
                  }
                ],
                where: {
                  id: data.payment.id
                }
              },
              { transaction: t }
            )
            .then(res => {
              //send to email
              APP.mailer.sendMail({
                subject: 'Company Verified',
                to: data.admin.email,
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
              console.log('Error sendEmail', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function createCompanyDB(data, callback) {
          let dbName = `${process.env.MYSQL_NAME}_${data.company.company_code}`;

          APP.db.sequelize
            .query(`CREATE DATABASE ${dbName}`, { transaction: t })
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
                      let mysqls = {
                        mysql: {}
                      };

                      Object.keys(models).forEach(val => {
                        if (models[val].associate) models[val].associate(models);

                        mysqls.mysql[val] = models[val];
                        APP.models.company[data.dbName] = mysqls;
                      });
                    }

                    n++;
                  });
                });
            });
          });
          return callback(null, {
            code: 'UPDATE_SUCCESS',
            id: 'PVP00',
            message: 'Validasi pembayaran berhasil!',
            data: {
              data
            }
          });
        }
      ],
      (err, result) => {
        if (err) {
          t.rollback();
          return callback(err);
        }
        t.commit();
        callback(null, result);
      }
    );
  });
};
