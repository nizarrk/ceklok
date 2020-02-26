'use strict';

const async = require('async');
const path = require('path');
const moment = require('moment');

exports.addPayment = (APP, req, callback) => {
  let { payment_type } = APP.models.mysql;
  let { name, desc, monthly, annual, monthlymin, annualmin } = req.body;
  let { user_id } = req.user;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && monthly && annual && monthlymin && annualmin) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'APQ96',
            message: 'Kesalahan pada parameter ( All )'
          });
        }
      },

      function createPaymentType(result, callback) {
        payment_type
          .create({
            name: name,
            description: desc,
            annual_price: monthly,
            monthly_price: annual,
            monthly_minimum: monthlymin,
            annual_minimum: annualmin,
            action_by: user_id
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'APP00',
              data: res
            });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'APQ98',
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

exports.addPaymentMethod = (APP, req, callback) => {
  let { payment_method, payment_type } = APP.models.mysql;
  let { name, desc, bank_name, rek_no, rek_name, limit, type } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && bank_name && rek_no && rek_name && limit && payment_type) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'APQ96',
            message: 'Kesalahan paremeter ( All )'
          });
        }
      },

      function uploadPath(result, callback) {
        try {
          let { mv, name } = req.files.file;
          let fileName = 'payment_method' + req.randomString + path.extname(name);

          callback(null, { mv, fileName });
        } catch (err) {
          callback({
            code: 'INVALID_REQUEST',
            id: 'APQ96',
            message: 'File tidak ada'
          });
        }
      },

      function checkPaymentType(result, callback) {
        payment_type
          .findAll({
            where: {
              id: type
            }
          })
          .then(res => {
            if (res.length > 0) {
              callback(null, result);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: 'APQ96',
                message: 'Kesalahan paremeter ( payment_type )'
              });
            }
          })
          .catch(err => {
            console.log('Error APQ98', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'APQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get payment type )',
              data: err
            });
          });
      },

      function insertPaymentMethod(result, callback) {
        payment_method
          .create({
            name: name,
            description: desc.toString(),
            payment_type: type,
            to_rek_id: rek_no,
            to_bank_name: bank_name,
            to_rek_name: rek_name,
            limit: limit,
            action_by: req.user.id,
            icon: `/uploads/payment_method/${result.fileName}`
          })
          .then(() => {
            callback(null, result);
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              id: 'APQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( create )',
              data: err
            });
          });
      },
      function uploadFile(result, callback) {
        let { fileName, mv } = result;
        mv(path.join(__dirname, '../public/uploads/payment_method/', fileName));

        callback(null, {
          code: 'INSERT_SUCCESS',
          id: 'APP00',
          message: 'Success'
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.editPaymentMethod = (APP, req, callback) => {
  let { payment_method } = APP.models.mysql;
  let { name, desc, bank_name, rek_no, rek_name, limit, id } = req.body;

  async.waterfall(
    [
      function checkParams(callback) {
        // if ( name && desc && bank_name && rek_no && rek_name && limit && id ) {
        callback(null, true);
        // } else {
        //     callback({
        //       code: 'INVALID_REQUEST',
        //       id: "EPQ96",
        //       message: 'Kesalahan paremeter ( All )'
        //     })
        // }
      },

      function checkUpload(result, callback) {
        try {
          let { mv, name } = req.files.file;
          let fileName = 'payment_method' + req.randomString + path.extname(name);

          callback(null, { mv, fileName, cek: true });
        } catch (err) {
          payment_method
            .findOne({
              where: {
                id: id
              }
            })
            .then(res => {
              if (res !== null) {
                callback(null, { icon: res.icon, cek: false });
              } else {
                callback({
                  code: 'INVALID_REQUEST',
                  id: 'EPQ96',
                  message: 'Kesalahan paremeter ( method )',
                  data: {}
                });
              }
            })
            .catch(err_file => {
              console.log(err_file);
              callback({
                code: 'ERR_DATABASE',
                id: 'EPQ96',
                message:
                  'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get payment_method )',
                data: err_file
              });
            });
        }
      },
      function updatePaymentMethod(result, callback) {
        payment_method
          .update(
            {
              name: name,
              description: desc.toString(),
              to_rek_id: rek_no,
              to_bank_name: bank_name,
              to_rek_name: rek_name,
              limit: limit,
              action_by: req.user.id,
              icon: result.cek ? `/uploads/payment_method/${result.fileName}` : result.icon
            },
            {
              where: { id: id }
            }
          )
          .then(() => {
            callback(null, result);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'EPQ96',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( create )',
              data: err
            });
          });
      },
      function uploadFile(result, callback) {
        if (result.cek) {
          let { fileName, mv } = result;
          mv(path.join(__dirname, '../public/uploads/payment_method/', fileName));
        }

        callback(null, {
          code: 'UPDATE_SUCCESS',
          id: 'APP00',
          message: 'Success'
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.paymentActivation = (APP, req, callback) => {
  // let {  dbsql , user_id , comm_id } = req.profile;
  let { payment, payment_detail, payment_method, payment_type, admin } = APP.models.mysql;
  // let { comm_payment_type } = app.models.community[dbsql].mysql;
  let { method, payment_type_id, type, company } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (method && payment_type_id && type) {
          if (type == 1 || type == 2) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'PLQ96',
              message: 'Kesalahan pada parameter ( type )'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'PLQ96',
            message: 'Kesalahan pada parameter ( All )'
          });
        }
      },
      function checkPaymentMethod(data, callback) {
        payment_method
          .findOne({
            where: {
              id: method,
              status: 1
            }
          })
          .then(res => {
            if (res !== null) {
              callback(null, {
                name: res.name,
                rek_id: res.to_rek_no,
                bank_name: res.to_bank_name,
                rek_name: res.to_rek_name
              });
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: 'PLQ96',
                message: 'Kesalahan pada parameter ( method )'
              });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'PLQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( payment_method )',
              data: err
            });
          });
      },
      function cekPaymentType(data, callback) {
        payment_type
          .findOne({
            where: {
              id: payment_type_id,
              status: 1
            }
          })
          .then(res => {
            if (res !== null) {
              let total = type == '1' ? res.monthly_price : type == '2' ? res.annual_price : 0;

              let subscription = type == '1' ? res.monthly_minimum : type == '2' ? res.annual_minimum : 0;

              data.id = res.id;
              data.total = total;
              // data.jenis_pembayaran = jenis_pembayaran;
              data.subscription = subscription;
              data.name = res.name;
              data.desc = res.description;

              callback(null, data);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: 'PLQ96',
                message: 'Kesalahan pada parameter ( method )'
              });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'PLQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( payment_type )',
              data: err
            });
          });
      },
      function getEmail(data, callback) {
        admin
          .findOne({
            where: {
              id: req.user.id
            }
          })
          .then(res => {
            data.email = res.email;
            callback(null, data);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'CMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( admin )',
              data: err
            });
          });
      },
      // function insert(data, callback) {
      //     comm_payment_type
      //         .create({
      //             payment_title: data.payment_title,
      //             description: data.description,
      //             status: 2,
      //             created_by: user_id,
      //         })
      //         .then(() =>{
      //             callback(null, data);
      //         })
      //         .catch(err =>{
      //            callback({
      //                 code: 'ERR_DATABASE',
      //                 id: 'CMQ98',
      //                 message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( insert payment type )',
      //                 data: err
      //             });
      //         });
      // },
      function insertPayment(data, callback) {
        let invoice = `PAY${moment().format('YYYYMMDD')}/${req.user.company}/${req.otp}`;

        payment
          .create({
            name: 'Pembayaran payment subscription',
            description: '',
            company_id: req.user.company,
            payment_metod_id: method,
            // transaction_type_id: 5,
            payment_type_id: data.id,
            subscription: data.subscription,
            invoice: invoice,
            total: data.total,
            action_by: req.user.id
          })
          .then(res => {
            data.payment_id = res.id;
            data.invoice = invoice;

            callback(null, data);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'CMQ98',
              message:
                'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( insert payment grand )',
              data: err
            });
          });
      },
      function paymentDetail(data, callback) {
        payment_detail
          .create({
            transaction_type_id: 2, // 2 = transaksi aktifasi payment
            payment_id: data.payment_id,
            invoice: data.invoice_number,
            // name: req.body.invoice.name,
            item_id: payment_type_id,
            // description: data.payment_title,
            // price: data.total,
            action_by: req.user.id
          })
          .then(() => {
            callback(null, data);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'CMQ98',
              message:
                'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( insert payment invoice )',
              data: err
            });
          });
      },
      function sendEmail(data, callback) {
        // let mailData = {
        //     subject: 'Inovice',
        //     invoice_number: data.invoice_number,
        //     email: data.email,
        //     pricing_title: data.payment_title,
        //     payment_total: data.total,
        //     payment_type: data.jenis_pembayaran,
        //     payment_title: data.payment_title,
        //     payment_method: data.payment_method,
        //     payment_bank_name: data.payment_bank_name,
        //     payment_account: data.payment_account,
        //     payment_owner_name: data.payment_owner_name,
        //     file: 'email/invoice_activation_payment.html'
        // };

        // app.email.sendHtml(mailData);

        callback(null, {
          code: 'OK',
          id: 'PLP00',
          message: 'Penambahan payment berhasil, silahkan melakukan pembayaran',
          data: {}
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.paymentSettings = (APP, req, callback) => {
  let { payment_type_setting_master } = APP.models.mysql;
  let { payment_type_setting } = APP.models.company[req.user.db].mysql;
  let settings = [];

  req.body.setting.map((x, index) => {
    let obj = {};

    obj.payment_type_id = req.body.setting[index].payment_type;
    obj.name = req.body.setting[index].name;
    obj.description = req.body.setting[index].desc;

    settings.push(obj);
  });

  payment_type_setting_master
    .bulkCreate(settings)
    .then(res => {
      callback(null, {
        code: 'INSERT_SUCCESS',
        data: res
      });
    })
    .catch(err => {
      console.log('Error addSetting', err);
      callback({
        code: 'ERR_DATABASE',
        message: 'Error addSetting',
        data: err
      });
    });
};

exports.paymentSettingsCompany = (APP, req, callback) => {
  let { payment_type_setting_master } = APP.models.mysql;
  let { payment_type_setting } = APP.models.company[req.user.db].mysql;

  async.waterfall(
    [
      function checkMaster(callback) {
        payment_type_setting_master
          .findOne({
            where: {
              id: req.body.master
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'payment_type_setting_master tidak ditemukan'
              });
            }
            callback(null, true);
          });
      },

      function addSettings(data, callback) {
        payment_type_setting
          .create({
            payment_type_setting_id: req.body.master,
            value: req.body.value
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log('Error addSetting', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error addSetting',
              data: err
            });
          });
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    }
  );
};
