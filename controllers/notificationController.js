'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');

exports.sendNotification = (APP, req, callback) => {
  let { name, desc, level, recipient_id, type, company_id, notif_type, email, url, broadcast_type } = req.body;
  let { company, admin, admin_app } = APP.models.mysql;
  let notification;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && level && recipient_id && type && notif_type && broadcast_type) {
          let params = {};
          // admin ceklok
          if (req.user.level === 1) {
            notification = APP.models.mysql.notification;
            if (company_id) {
              params = {
                id: company_id,
                status: 1
              };

              callback(null, params);
            } else {
              params = {
                status: 1
              };

              callback(null, params);
            }
            // admin company
          } else if (req.user.level === 2) {
            notification = APP.models.company[req.user.db].mysql.notification;
            params = {
              id: req.user.company,
              status: 1
            };

            callback(null, params);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'SNQ96',
              message: 'Kesalahan pada parameter user.level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SNQ96',
            message: 'Kesalahan pada parameter all'
          });
        }
      },

      function checkBroadcastType(data, callback) {
        // single add
        if (broadcast_type == '0') {
          callback(null, {
            params: data,
            broadcast: false
          });
          //broadast add
        } else if (broadcast_type == '1') {
          callback(null, {
            params: data,
            broadcast: true
          });
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SMQ96',
            message: 'Kesalahan pada parameter broadcast_type'
          });
        }
      },

      function checkCompany(data, callback) {
        company
          .findAll({
            attributes: ['id', 'company_code'],
            where: data.params
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SNQ97',
                message: 'Company tidak di temukan'
              });
            } else {
              callback(null, {
                broadcast: data.broadcast,
                company: res
              });
            }
          })
          .catch(err => {
            console.log('Error checkCompany', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'SNQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
              data: err
            });
          });
      },

      function checkRecipientEmail(data, callback) {
        let arr = [];
        Promise.all(
          data.company.map(x => {
            let query =
              level == 1
                ? admin_app
                : level == 2
                ? admin
                : level == 3
                ? APP.models.company[`${process.env.MYSQL_NAME}_${x.company_code}`].mysql.employee
                : callback({
                    code: 'INVALID_REQUEST',
                    id: 'SMQ96',
                    message: 'Kesalahan pada parameter level'
                  });

            let params =
              level == 1
                ? { status: 1 }
                : level == 2
                ? { company_code: x.company_code, status: 1 }
                : level == 3
                ? { company_code: x.company_code, status: 1 }
                : callback({
                    code: 'INVALID_REQUEST',
                    id: 'SMQ96',
                    message: 'Kesalahan pada parameter level'
                  });

            return query
              .findAll({
                attributes: ['id', 'email'],
                where: params
              })
              .then(res => {
                return res.map(y => {
                  let obj = {};

                  obj.recipient_id = y.id;
                  obj.company_id = x.id;
                  obj.email = y.email;

                  arr.push(obj);
                });
              })
              .catch(err => {
                console.log('Error checkRecipientEmail', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'SNQ98',
                  message:
                    'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
                  data: err
                });
              });
          })
        )
          .then(() => {
            if (arr.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SNQ97',
                message: 'Email tidak di temukan'
              });
            } else {
              callback(null, {
                broadcast: data.broadcast,
                company: data.company,
                arr: arr
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'SNP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(notification, 'N');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              broadcast: data.broadcast,
              company: data.company,
              arr: data.arr,
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'SMP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function insertNotification(data, callback) {
        if (!data.broadcast) {
          notification
            .create({
              name: name,
              code: data.code,
              description: desc,
              email: data.arr[0].email,
              url: url,
              company_id: company_id,
              recipient_id: recipient_id,
              recipient_level: level,
              sender_level: req.user.level,
              notification_type: notif_type,
              notification_sub_type: type,
              created_by: req.user.id
            })
            .then(res => {
              callback(null, res);
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SNQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        } else {
          Promise.all(
            data.arr.map(x => {
              let obj = {};

              obj.name = name;
              obj.code = data.code;
              obj.description = desc;
              obj.email = x.email;
              obj.url = url;
              obj.company_id = x.company_id;
              obj.recipient_id = x.recipient_id;
              obj.recipient_level = level;
              obj.sender_level = req.user.level;
              obj.broadcast_type = broadcast_type;
              obj.notification_type = notif_type;
              obj.notification_sub_type = type;
              obj.created_by = req.user.id;

              return obj;
            })
          ).then(arr => {
            notification.bulkCreate(arr).then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                id: 'SNP00',
                message: 'Notifikasi berhasil dikirimkan',
                data: res
              });
            });
          });
        }
      }

      //tinggal tes mau pake push atau mail
      // function sendMail(data, callback) {
      //   try {
      //       APP.mailer.sendMail({
      //         subject: name,
      //         to: data.email,
      //         data: {
      //           data: data
      //         },
      //         file: 'notification.html'
      //       });

      //       callback(null, {
      //         code: 'INSERT_SUCCESS',
      //         id: 'SNP00',
      //         message: 'Notifikasi berhasil dikirimkan',
      //         data: data
      //       });
      //     } catch (err) {
      //       console.log(err);
      //       callback({
      //         code: 'ERR',
      //         id: 'SNP01',
      //         message: 'Terjadi Kesalahan, mohon coba kembali',
      //         data: err
      //       });
      //     }
      // }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
