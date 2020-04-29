'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');

exports.broadcastLetter = (APP, req, callback) => {
  let { letter_broadcast, employee } = APP.models.company[req.user.db].mysql;
  let { name, desc, recipient } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && recipient) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'BSQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkRecipient(data, callback) {
        employee
          .findAll({
            where: {
              id: recipient.split(',')
            }
          })
          .then(res => {
            if (res.length === recipient.split(',').length) {
              Promise.all(
                res.map(x => {
                  let obj = {};

                  obj.id = x.dataValues.id;
                  obj.email = x.dataValues.email;

                  return obj;
                })
              ).then(arr => {
                callback(null, arr);
              });
            } else {
              callback({
                code: 'NOT_FOUND',
                id: 'BSQ97',
                message: 'Karyawan Tidak ditemukan'
              });
            }
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(letter_broadcast, 'BL');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              employee: data,
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'BSP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function uploadPath(data, callback) {
        try {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback({
              code: 'INVALID_REQUEST',
              id: 'BSQ96',
              message: 'Kesalahan pada parameter upload'
            });
          }

          APP.fileCheck(req.files.upload.data, 'doc').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/broadcast/letter/`;

              callback(null, {
                employee: data.employee,
                code: data.code,
                doc: docPath + fileName + path.extname(req.files.upload.name)
              });
            }
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: 'BSP01',
            message: 'Terjadi Kesalahan, mohon coba kembali',
            data: err
          });
        }
      },

      function createNewBroadcast(data, callback) {
        let email = [];
        Promise.all(
          data.employee.map(x => {
            let obj = {};
            obj.code = data.code;
            obj.upload = data.doc.slice(8);
            obj.name = name;
            obj.description = desc;
            obj.created_by = req.user.id;
            obj.user_id = x.id;

            email.push(x.email);

            return obj;
          })
        )
          .then(arr => {
            letter_broadcast
              .bulkCreate(arr)
              .then(res => {
                // upload file
                if (req.files.upload) {
                  req.files.upload.mv(data.doc, function(err) {
                    if (err) {
                      console.log(err);
                      return callback({
                        code: 'ERR',
                        id: 'BSP01',
                        message: 'Terjadi Kesalahan upload, mohon coba kembali',
                        data: err
                      });
                    }
                  });
                }

                callback(null, {
                  inserted: res,
                  email: email,
                  path: data.doc
                });
              })
              .catch(err => {
                console.log('Error bulkCreate', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'BSQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error Promise.all', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'BSQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function sendMail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Broadcast Letter',
            to: data.email,
            data: {
              desc: data.inserted[0].description
            },
            attachments: [
              {
                filename: data.path.slice(53), // slice 53 buat ngambil nama file
                path: req.protocol + '://' + req.get('host') + data.path.slice(8) // slice 8 buat hilangin /public
              }
            ],
            file: 'broadcast_letter.html'
          });

          callback(null, {
            code: 'INSERT_SUCCESS',
            id: 'BSP00',
            message: 'Broadcast surat berhasil dilakukan',
            data: data.inserted
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: 'BSP01',
            message: 'Terjadi Kesalahan, mohon coba kembali',
            data: err
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

exports.resendBroadcastLetter = (APP, req, callback) => {
  let { letter_broadcast, employee } = APP.models.company[req.user.db].mysql;

  async.waterfall(
    [
      function checkParam(callback) {
        if (req.body.id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'RBQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function getCurrentData(data, callback) {
        letter_broadcast
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: 'RBQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              if (
                res.counter === 1 &&
                moment(res.created_at).format('YYYY-MM-DD') == moment(req.currentDate.getTime()).format('YYYY-MM-DD')
              ) {
                callback({
                  code: 'INVALID_REQUEST',
                  id: '?',
                  message: 'Sudah melakukan rebroadcast hari ini, ulangi lagi besok!'
                });
              } else {
                callback(null, res.dataValues);
              }
            }
          });
      },

      function getRecipientEmail(data, callback) {
        employee
          .findOne({
            where: {
              id: data.user_id
            }
          })
          .then(res => {
            if (res.length !== 0) {
              callback(null, {
                broadcast: data,
                email: res.dataValues.email
              });
            } else {
              callback({
                code: 'NOT_FOUND',
                id: 'RBQ97',
                message: 'Karyawan Tidak ditemukan'
              });
            }
          });
      },

      function updateBroadcastLetter(data, callback) {
        letter_broadcast
          .update(
            {
              updated_at: new Date(),
              updated_by: req.user.id,
              counter: 1
            },
            {
              where: {
                id: req.body.id
              }
            }
          )
          .then(updated => {
            callback(null, {
              broadcast: data.broadcast,
              email: data.email,
              updated: updated
            });
          })
          .catch(err => {
            console.log('Error updateBroadcastLetter', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'RBQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function resendEmail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Broadcast Letter',
            to: data.email,
            data: {
              desc: data.broadcast.description
            },
            attachments: [
              {
                filename: '/public' + data.broadcast.upload,
                path: req.protocol + '://' + req.get('host') + data.broadcast.upload
              }
            ],
            file: 'broadcast_letter.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: 'RBP00',
            message: 'Broadcast surat berhasil dilakukan ulang',
            data: data.updated
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: 'RBP01',
            message: 'Terjadi Kesalahan, mohon coba kembali',
            data: err
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

exports.broadcastList = (APP, req, callback) => {
  if (req.user.level === 2 || req.user.level === 3) {
    let start = req.body.datestart + ' 00:00:00';
    let end = req.body.dateend + ' 23:59:59';
    console.log(req.body);

    let where =
      req.body.datestart && req.body.dateend ? `WHERE b.created_at BETWEEN '${start}' AND '${end}'` : 'WHERE 1 + 1';

    APP.db.sequelize
      .query(
        `SELECT 
        b.*, e.id AS 'recipient_id', e.name AS 'recipient', g.name AS 'recipient_grade_name', a.name AS 'created_by_name', a2.name AS 'updated_by_name'
      FROM 
        ${req.user.db}.letter_broadcast
      AS
        b
      JOIN
        ${req.user.db}.employee
      AS
        e
      ON
        b.user_id = e.id
      LEFT JOIN
        ${req.user.db}.grade
      AS
        g
      ON
        e.grade_id = g.id
      LEFT JOIN
        ceklok.admin
      AS
        a
      ON
        b.created_by = a.id 
      LEFT JOIN
        ceklok.admin
      AS
        a2
      ON
        b.updated_by = a2.id 
      ${where}
      `
      )
      .then(res => {
        if (res[0].length == 0) {
          callback({
            code: 'NOT_FOUND',
            id: 'LSQ97',
            message: 'Data Tidak ditemukan'
          });
        } else {
          callback(null, {
            code: 'FOUND',
            id: 'LSP00',
            message: 'List surat berhasil ditemukan',
            data: res[0]
          });
        }
      })
      .catch(err => {
        console.log(err);
        callback({
          code: 'ERR_DATABASE',
          id: 'LSQ98',
          message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
        });
      });
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};

exports.broadcastDetail = (APP, req, callback) => {
  if (!req.body.id) {
    callback({
      code: 'INVALID_REQUEST',
      id: 'DSQ96',
      message: 'Kesalahan pada parameter'
    });
  } else {
    let escape = req.body.id.replace(/[\\"*&-+`.,;:]/g, "'\\''");
    if (req.user.level === 2 || req.user.level === 3) {
      APP.db.sequelize
        .query(
          `SELECT 
          b.*, e.id AS 'recipient_id', e.name AS 'recipient', g.name AS 'recipient_grade_name', a.name AS 'created_by_name', a2.name AS 'updated_by_name'
        FROM 
          ${req.user.db}.letter_broadcast
        AS
          b
        JOIN
          ${req.user.db}.employee
        AS
          e
        ON
          b.user_id = e.id
        LEFT JOIN
          ${req.user.db}.grade
        AS
          g
        ON
          e.grade_id = g.id
        LEFT JOIN
          ceklok.admin
        AS
          a
        ON
          b.created_by = a.id 
        LEFT JOIN
          ceklok.admin
        AS
          a2
        ON
          b.updated_by = a2.id
        WHERE
          b.id = ${escape}
        `
        )
        .then(res => {
          if (res[0].length == 0) {
            callback({
              code: 'NOT_FOUND',
              id: 'DSQ97',
              message: 'Data Tidak ditemukan'
            });
          } else {
            callback(null, {
              code: 'FOUND',
              id: 'DSP00',
              message: 'Detail Surat berhasil ditemukan',
              data: res[0][0]
            });
          }
        })
        .catch(err => {
          console.log(err);
          callback({
            code: 'ERR_DATABASE',
            id: 'DSQ98',
            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
          });
        });
    } else {
      callback({
        code: 'INVALID_REQUEST',
        id: '?',
        message: 'Invalid user level'
      });
    }
  }
};
