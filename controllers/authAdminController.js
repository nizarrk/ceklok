'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const moment = require('moment');
const verifyController = require('./verifyController');
const axios = require('axios');

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
          id: 'ARP01',
          message: 'Email Company sudah pernah terdaftar, gunakan email yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Email Company tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error email company', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
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
          id: 'ARP01',
          message: 'Telp Company sudah pernah terdaftar, gunakan Telp yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Telp Company tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error telp company', err);
      return callback({
        code: 'ERR_DATABASE',
        data: err
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
          id: 'ARP01',
          message: 'Email Admin sudah pernah terdaftar, gunakan email yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Email Admin Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error email admin', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
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
          id: 'ARP01',
          message: 'Telp Admin sudah pernah terdaftar, gunakan Telp yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Telp Admin Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error telp admin', err);
      callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
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
          id: 'ARP01',
          message: 'Username sudah pernah terdaftar, gunakan username yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Username Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error username', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
      });
    });
};

exports.checkExistingCredentialsCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function checkTelp(callback) {
        module.exports.checkExistingTelpCompany(APP, req, callback);
      }

      // function checkEmail(result, callback) {
      //   module.exports.checkExistingEmailCompany(APP, req, callback);
      // }
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
  let { company, admin, payment, payment_type, payment_method, payment_detail, pricing } = APP.models.mysql;
  APP.db.sequelize.transaction().then(t => {
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
                  code: 'ERR',
                  id: 'ARN99',
                  message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          } else {
            return callback(pass);
          }
        },

        function registerCompany(result, callback) {
          company
            .create(
              {
                pricing_id: req.body.company.pricing,
                name: req.body.company.name,
                address: req.body.company.address,
                kelurahan: req.body.company.kel,
                kecamatan: req.body.company.kec,
                city: req.body.company.city,
                province: req.body.company.prov,
                zipcode: req.body.company.zip,
                photo: 'default.jpg',
                msisdn: 'default',
                tlp: req.body.company.telp,
                email: req.body.company.email,
                payment_status: 0
              },
              { transaction: t }
            )
            .then(res => {
              callback(null, {
                pass: result,
                company: res
              });
            })
            .catch(err => {
              console.log(err);

              if (err.original && err.original.code === 'ER_DUP_ENTRY') {
                let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
                return callback({
                  code: 'DUPLICATE',
                  id: 'ARQ96',
                  message: 'Kesalahan pada parameter',
                  info: {
                    parameter: params
                  }
                });
              }

              if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
                let params = 'Error! Empty Query'; //This is only example, Object can also be used
                return callback({
                  code: 'UPDATE_NONE',
                  id: 'ARQ96',
                  message: 'Kesalahan pada parameter',
                  info: {
                    parameter: params
                  }
                });
              }

              return callback({
                code: 'ERR_DATABASE',
                id: 'ARQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function registerAdminToSupportPal(data, callback) {
          let fullname = req.body.admin.name.split(' ');
          let firstname = fullname[0];
          let lastname = fullname[fullname.length - 1];

          axios({
            method: 'POST',
            auth: {
              username: process.env.SUPP_TOKEN,
              password: ''
            },
            url: `${process.env.SUPP_HOST}/api/user/user`,
            data: {
              brand_id: process.env.SUPP_BRAND_ID,
              firstname: firstname,
              lastname: lastname,
              email: req.body.admin.email,
              password: data.pass,
              organisation: 'CEKLOK'
            }
          })
            .then(res => {
              callback(null, {
                pass: data.pass,
                company: data.company,
                support: res.data.data
              });
            })
            .catch(err => {
              if (
                err.response.data.status == 'error' &&
                err.response.data.message == 'The email has already been taken.'
              ) {
                callback(null, {
                  pass: data.pass,
                  company: data.company
                });
              } else {
                callback({
                  code: 'ERR',
                  message: err.response.data.message,
                  data: err
                });
              }
            });
        },

        function getSupportPalId(data, callback) {
          axios({
            method: 'GET',
            auth: {
              username: process.env.SUPP_TOKEN,
              password: ''
            },
            url: `${process.env.SUPP_HOST}/api/user/user?email=${req.body.admin.email}&brand_id=${process.env.SUPP_BRAND_ID}`
          })
            .then(res => {
              if (res.data.data.length == 0) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Email tidak ditemukan!'
                });
              } else {
                callback(null, {
                  pass: data.pass,
                  company: data.company,
                  support: res.data.data[0]
                });
              }
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR',
                message: err.response.data.message,
                data: err
              });
            });
        },

        function registerAdmin(data, callback) {
          let email = APP.validation.email(req.body.admin.email);
          let username = APP.validation.username(req.body.admin.username);

          if (email && username) {
            admin
              .create(
                {
                  support_pal_id: data.support.id,
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
                  photo: 'default.jpg',
                  tlp: req.body.admin.telp,
                  email: req.body.admin.email,
                  user_name: req.body.admin.username,
                  password: data.pass,
                  old_password: data.pass
                },
                { transaction: t }
              )
              .then(res => {
                callback(null, {
                  admin: res,
                  company: data.company
                });
              })
              .catch(err => {
                console.log('Error registerAdmin', err);

                if (err.original && err.original.code === 'ER_DUP_ENTRY') {
                  let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
                  return callback({
                    code: 'DUPLICATE',
                    id: 'ARQ96',
                    message: 'Kesalahan pada parameter',
                    info: {
                      parameter: params
                    }
                  });
                }

                if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
                  let params = 'Error! Empty Query'; //This is only example, Object can also be used
                  return callback({
                    code: 'UPDATE_NONE',
                    id: 'ARQ96',
                    message: 'Kesalahan pada parameter',
                    info: {
                      parameter: params
                    }
                  });
                }

                return callback({
                  code: 'ERR_DATABASE',
                  id: 'ARQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          } else {
            if (email !== true) return callback(email);
            if (username !== true) return callback(username);
          }
        },

        function getPricingInfo(data, callback) {
          pricing
            .findOne({
              where: {
                id: req.body.payment.pricing
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'NOT_FOUND',
                  message: 'Pricing tidak ditemukan!'
                });
              }

              let total =
                req.body.payment.type == '1'
                  ? res.monthly_price
                  : req.body.payment.type == '2'
                  ? res.annual_price
                  : req.body.payment.type == '3'
                  ? res.one_time_price
                  : 0;

              let subscription =
                req.body.payment.type == '1'
                  ? res.monthly_minimum
                  : req.body.payment.type == '2'
                  ? res.annual_minimum
                  : req.body.payment.type == '3'
                  ? res.one_time_minimum
                  : 0;

              let free = total == 0 ? true : false;

              callback(null, {
                admin: data.admin,
                company: data.company,
                paymentInfo: {
                  free: free,
                  total: total,
                  subscription: subscription
                }
              });
            });
        },

        function paymentUser(data, callback) {
          let invoice = `REG${moment().format('YYYYMMDD')}/${req.otp}`;

          payment
            .create(
              {
                payment_method_id: req.body.payment.method,
                // pricing_id: req.body.payment.pricing,
                invoice: invoice,
                company_id: data.company.id,
                name: 'Invoice Registrasi',
                description: 'Invoice untuk bukti registrasi company',
                subscription_type: req.body.payment.type,
                subscription: data.paymentInfo.subscription,
                total: data.paymentInfo.total,
                status: data.paymentInfo.free ? 1 : 0
              },
              { transaction: t }
            )
            .then(res => {
              callback(null, {
                admin: data.admin.dataValues,
                company: data.company.dataValues,
                payment: res.dataValues
              });
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
                id: 'ARQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function paymentDetail(data, callback) {
          payment_detail
            .create(
              {
                transaction_type_id: 1, // 1 = traksaksi registrasi
                payment_id: data.payment.id,
                item_id: req.body.payment.pricing,
                invoice: data.payment.invoice
              },
              { transaction: t }
            )
            .then(res => {
              t.commit();

              callback(null, {
                admin: data.admin,
                company: data.company,
                payment: {
                  data: data.payment,
                  detail: res.dataValues
                }
              });
            });
        },

        function getPaymentInfo(data, callback) {
          // add payment_detail to payment
          payment.hasMany(payment_detail, {
            sourceKey: 'id',
            foreignKey: 'payment_id'
          });
          // add payment_method to payment
          payment.belongsTo(payment_method, {
            targetKey: 'id',
            foreignKey: 'payment_method_id'
          });
          // add pricing to payment
          payment_detail.belongsTo(pricing, {
            targetKey: 'id',
            foreignKey: 'item_id'
          });
          // add payment_type to payment_method
          payment_method.belongsTo(payment_type, {
            targetKey: 'id',
            foreignKey: 'payment_type_id'
          });

          payment
            .findOne({
              include: [
                {
                  model: payment_detail,
                  include: [
                    {
                      model: pricing
                    }
                  ]
                },
                {
                  model: payment_method,
                  include: [
                    {
                      model: payment_type
                    }
                  ]
                }
              ],
              where: {
                id: data.payment.data.id
              }
            })
            .then(res => {
              callback(null, {
                admin: data.admin,
                company: data.company,
                payment: res
              });
            })
            .catch(err => {
              console.log('2', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'ARQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function sendInvoice(data, callback) {
          //send to email
          APP.mailer.sendMail({
            subject: 'Invoice',
            to: data.admin.email,
            data: {
              payment: data.payment,
              company: data.company
            },
            file: 'invoice.html'
          });

          callback(null, {
            code: 'INSERT_SUCCESS',
            id: 'ARP00',
            message: 'Registrasi Sukses!',
            data: data
          });
        }
      ],
      (err, result) => {
        if (err) {
          t.rollback();
          return callback(err);
        }
        if (result.data.payment.total == 0) {
          console.log('masuk free');

          return verifyController.freemiumVerify(APP, result.data, req, callback);
        }

        callback(null, result);
      }
    );
  });
};

exports.paymentList = (APP, req, callback) => {
  let { payment_type, payment_method } = APP.models.mysql;

  payment_type.hasMany(payment_method, {
    sourceKey: 'id',
    foreignKey: 'payment_type_id'
  });

  payment_type
    .findAll({
      include: [
        {
          model: payment_method
        }
      ]
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          id: '?',
          message: 'Payment list tidak ditemukan'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          id: '?',
          data: res
        });
      }
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        id: '?',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
      });
    });
};

exports.paymentDetail = (APP, req, callback) => {
  let { payment, payment_detail, payment_type, payment_method } = APP.models.mysql;

  payment.belongsTo(payment_method, {
    targetKey: 'id',
    foreignKey: 'payment_method_id'
  });

  payment_method.belongsTo(payment_type, {
    targetKey: 'id',
    foreignKey: 'payment_type_id'
  });

  payment
    .findOne({
      include: [
        {
          model: payment_method,
          attributes: ['id', 'name', 'description', 'to_bank_name', 'to_rek_name', 'to_rek_no'],
          include: [
            {
              model: payment_type,
              attributes: ['id', 'name', 'description']
            }
          ]
        }
      ],
      where: {
        invoice: req.body.invoice
      }
    })
    .then(res => {
      if (res == null) {
        callback({
          code: 'NOT_FOUND',
          message: 'Payment tidak ditemukan'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          message: 'Payment Ditemukan',
          data: res
        });
      }
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        message: '',
        data: err
      });
    });
};

exports.paymentCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function checkPaymentStatus(callback) {
        APP.models.mysql.payment
          .findOne({
            where: {
              invoice: req.body.invoice
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: 'PVP01',
                message: 'Invoice tidak ditemukan, mohon periksa kembali nomor invoice anda.'
              });
            } else {
              if (res.image == null || res.image == '') {
                return callback(null, true);
              } else {
                callback({
                  code: 'INVALID_REQUEST',
                  id: '?',
                  message: 'Invoice sudah di proses, silahkan tunggu untuk admin melakukan approval'
                });
              }
            }
          })
          .catch(err => {
            console.log(' Error checkPaymentStatus', err);

            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
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

          // if (!fs.existsSync(imagePath)) {
          //   mkdirp.sync(imagePath);
          // }

          callback(null, imagePath + fileName + path.extname(req.files.image.name));
        } catch (err) {
          console.log(err);

          callback({
            code: 'ERR',
            id: 'PVP03',
            message: 'Terjadi kesalahan, mohon ulangi kembali.',
            data: err
          });
        }
      },

      function updatePaymentDetails(result, callback) {
        APP.models.mysql.payment
          .update(
            {
              from_bank_name: req.body.bank,
              from_rek_name: req.body.name,
              from_rek_no: req.body.no,
              image: result.slice(8)
            },
            {
              where: {
                invoice: req.body.invoice
              }
            }
          )
          .then(res => {
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

            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'PVP00',
              message: 'Verifikasi pembayaran diterima!',
              data: res
            });
          })
          .catch(err => {
            console.log('Error updatePaymentDetails', err);

            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.login = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
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

        if (req.body.platform != 'Web')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            message: 'Invalid key, username'
          });

        callback(null, true);
      },

      function checkAdmin(index, callback) {
        APP.models.mysql.admin.belongsTo(APP.models.mysql.company, {
          targetKey: 'id',
          foreignKey: 'company_id'
        });

        APP.models.mysql.admin
          .findAll({
            include: [
              {
                model: APP.models.mysql.company,
                attributes: ['id', 'name']
              }
            ],
            attributes: [
              'id',
              'support_pal_id',
              'company_id',
              'company_code',
              'name',
              'password',
              'photo',
              'initial_login',
              'login_attempt',
              'status',
              'created_at',
              'updated_at'
            ],
            where: {
              user_name: req.body.username
            }
          })
          .then(rows => {
            if (rows.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Invalid Username or Password'
              });
            } else {
              if (rows[0].status !== 1) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'Company have to wait for admin to verify their account first!'
                });
              } else {
                // let now = new Date().getTime();
                // let updated = new Date(rows[0].updated_at).getTime();
                // console.log(rows[0].login_attempt >= 3 && now > updated);

                if (rows[0].login_attempt < 3) {
                  callback(null, rows);
                } else {
                  callback({
                    code: 'INVALID_REQUEST',
                    message:
                      'Anda telah mencapai limit kesalahan login! Silahkan menghubungi tim operasional untuk membuka akses pada akun anda kembali!'
                  });
                }
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
              // reset failed attempt counter
              APP.models.mysql.admin
                .update(
                  {
                    login_attempt: 0,
                    updated_at: new Date()
                  },
                  {
                    where: {
                      id: rows[0].id
                    }
                  }
                )
                .then(() => {
                  callback(null, {
                    id: rows[0].id,
                    support_pal_id: rows[0].support_pal_id,
                    company_id: rows[0].company_id,
                    company_code: rows[0].company_code,
                    company_name: rows[0].company.name,
                    name: rows[0].name,
                    photo: rows[0].photo,
                    initial_login: rows[0].initial_login
                  });
                })
                .catch(err => {
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            } else {
              // update failed attempt counter
              APP.models.mysql.admin
                .update(
                  {
                    login_attempt: rows[0].login_attempt + 1,
                    updated_at: new Date()
                  },
                  {
                    where: {
                      id: rows[0].id
                    }
                  }
                )
                .then(() => {
                  callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid Username or Password'
                  });
                })
                .catch(err => {
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR',
              message: 'Error comparePassword',
              data: err
            });
          });
      },

      function initialLoginStatus(rows, callback) {
        APP.models.mysql.admin
          .update(
            {
              initial_login: 1
            },
            {
              where: {
                id: rows.id
              }
            }
          )
          .then(() => {
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

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows.id,
            company: rows.company_id,
            code: rows.company_code,
            db: `${process.env.MYSQL_NAME}_${rows.company_code}`,
            level: 2,
            admin: true
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_user: rows.id,
            level: 2,
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
                .then(res => {
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
                  level: 2,
                  company_code: rows.company_code,
                  platform: req.body.platform,
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(() => {
                  callback(null, {
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

// sek gatau ini dipake dimana
// exports.editStatusContractEmployee = (APP, req, callback) => {
//   APP.models.company[req.user.db].mysql.job_title
//     .update(
//       {
//         name: req.body.name,
//         description: req.body.desc
//       },
//       {
//         where: {
//           id: req.body.id
//         }
//       }
//     )
//     .then(result => {
//       if (!result || (result && !result[0])) {
//         let params = 'No data updated'; //This is only example, Object can also be used
//         return callback(null, {
//           code: 'UPDATE_NONE',
//           data: params
//         });
//       }

//       let params = 'Update Success'; //This is only example, Object can also be used
//       return callback(null, {
//         code: 'UPDATE_SUCCESS',
//         data: params
//       });
//     })
//     .catch(err => {
//       console.log('iki error', err);

//       if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
//         let params = 'Error! Empty Query'; //This is only example, Object can also be used
//         return callback({
//           code: 'UPDATE_NONE',
//           data: params
//         });
//       }

//       if (err.original && err.original.code === 'ER_DUP_ENTRY') {
//         let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
//         return callback({
//           code: 'DUPLICATE',
//           data: params
//         });
//       }

//       return callback({
//         code: 'ERR_DATABASE',
//         data: err
//       });
//     });
// };
