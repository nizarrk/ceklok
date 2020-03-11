'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');

exports.sendMessage = (APP, req, callback) => {
  let { name, desc, level, recipient_id, message_type, company_id, broadcast_type } = req.body;
  let { company, admin, admin_app } = APP.models.mysql;
  let inbox;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && level && recipient_id && message_type && broadcast_type) {
          let params = {};
          // admin ceklok
          if (req.user.level === 1) {
            inbox = APP.models.mysql.inbox;
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
            inbox = APP.models.company[req.user.db].mysql.inbox;
            params = {
              id: req.user.company,
              status: 1
            };

            callback(null, params);
          } else {
            callback({
              code: 'INVALID',
              id: 'SMQ96',
              message: 'Kesalahan pada parameter user.level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SMQ96',
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
            where: data.params
          })
          .then(res => {
            console.log(res.length);

            if (res.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SMQ96',
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
              id: 'SMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
              data: err
            });
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(inbox, 'BM');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              broadcast: data.broadcast,
              company: data.company,
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

      function insertMessage(data, callback) {
        if (!data.broadcast) {
          inbox
            .create({
              name: name,
              code: data.code,
              description: desc,
              company_id: company_id,
              recipient_id: recipient_id,
              recipient_level: level,
              sender_level: req.user.level,
              broadcast_type: broadcast_type,
              message_type: message_type,
              created_by: req.user.id
            })
            .then(res => {
              callback(null, {
                code: 'OK',
                no: 'SMP00',
                message: 'Message berhasil disimpan',
                data: {}
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SMQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        } else {
          let arr = [];
          Promise.all(
            data.company.map((x, i) => {
              let { employee } = APP.models.company[`ceklok_${x.company_code}`].mysql;
              let query = level == 1 ? admin_app : level == 2 ? admin : level == 3 ? employee : '';

              let params = level == 1 ? {} : level == 2 ? { company_code: x.company_code } : level == 3 ? {} : '';

              return query
                .findAll({
                  where: params
                })
                .then(res => {
                  return res.map((y, i2) => {
                    let obj = {};

                    obj.name = name;
                    obj.code = data.code;
                    obj.description = desc;
                    obj.company_id = x.id;
                    obj.recipient_id = y.id;
                    obj.recipient_level = level;
                    obj.sender_level = req.user.level;
                    obj.broadcast_type = broadcast_type;
                    obj.message_type = message_type;
                    obj.created_by = req.user.id;

                    arr.push(obj);
                  });
                });
            })
          )
            .then(() => {
              if (arr.length == 0) {
                callback({
                  code: 'NOT_FOUND',
                  id: 'SMQ97',
                  message: 'Penerima tidak ditemukan'
                });
              } else {
                inbox
                  .bulkCreate(arr)
                  .then(res => {
                    callback(null, {
                      code: 'INSERT_SUCCESS',
                      id: 'SMP00',
                      message: 'Message berhasil disimpan ( Broadcast )',
                      data: res
                    });
                  })
                  .catch(err => {
                    console.log(err);
                    callback({
                      code: 'ERR_DATABASE',
                      id: 'SMQ98',
                      message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                      data: err
                    });
                  });
              }
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
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
