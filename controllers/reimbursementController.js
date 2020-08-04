'use strict';

const async = require('async');
const path = require('path');
const moment = require('moment');

exports.get = (APP, req, callback) => {
  let { reimbursement } = APP.models.company[req.user.db].mysql;
  let params = {};

  if (req.user.level == 2) params = {}; //admin
  if (req.user.level == 3) params = { user_id: req.user.id }; // employee

  reimbursement
    .findAll(params)
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.insert = (APP, req, callback) => {
  let { reimbursement_type, reimbursement } = APP.models.company[req.user.db].mysql;
  let { name, desc, reimbursement_type_id } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!name)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter name!'
          });

        if (!desc)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter desc!'
          });

        if (!reimbursement_type_id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter reimbursement_type_id!'
          });

        callback(null, true);
      },

      function checkReimbursementType(data, callback) {
        reimbursement_type
          .findOne({
            where: {
              id: reimbursement_type_id
            }
          })
          .then(res => {
            if (res == null)
              return callback({
                code: 'NOT_FOUND',
                message: 'Reimbursement tidak ditemukan!'
              });

            callback(null, res.dataValues);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(reimbursement, 'R');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              type: data,
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: '?',
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
              message: 'Kesalahan pada parameter upload!'
            });
          }

          APP.fileCheck(req.files.upload.tempFilePath, 'all').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/employee/reimbursement/`;

              callback(null, {
                kode: data.code,
                type: data.type,
                doc: docPath + fileName + path.extname(req.files.upload.name)
              });
            }
          });
        } catch (err) {
          console.log('Error uploadPath', err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function uploadProcess(data, callback) {
        try {
          // upload file
          if (req.files.upload) {
            APP.cdn.uploadCDN(req.files.upload, data.doc).then(res => {
              if (res.error == true) {
                callback({
                  code: 'ERR',
                  data: res.data
                });
              } else {
                callback(null, data);
              }
            });
          } else {
            callback(null, data);
          }
        } catch (err) {
          console.log('Error uploadProcess', err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function requestReimbursement(data, callback) {
        reimbursement
          .create({
            code: data.kode,
            user_id: req.user.id,
            reimbursement_type_id: reimbursement_type_id,
            name: name,
            description: desc,
            upload: data.doc.slice(8),
            created_by: req.user.id
          })
          .then(created => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: created
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
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

exports.updateStatus = (APP, req, callback) => {
  let { reimbursement, employee } = APP.models.company[req.user.db].mysql;
  let { status, notes, id } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!status)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter status!'
          });

        // if (!notes)
        // return callback({
        //     code: 'INVALID_REQUEST',
        //     message: 'Kesalahan pada parameter notes!'
        // });

        if (!id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });

        callback(null, true);
      },

      function getCurrentData(data, callback) {
        reimbursement
          .findOne({
            where: {
              id: id,
              status: 0
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Data Tidak ditemukan'
              });
            } else {
              callback(null, res.dataValues);
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function getRequesterEmail(data, callback) {
        employee
          .findOne({
            where: {
              id: data.created_by
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Employee Tidak ditemukan'
              });
            } else {
              callback(null, {
                details: data,
                email: res.dataValues.email
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function updateApproval(data, callback) {
        let resultTime = moment.utc(moment().diff(moment(data.details.created_at))).format('HH:mm:ss');

        reimbursement
          .update(
            {
              status: status,
              notes: notes,
              approved_by: req.user.id,
              approved_at: new Date(),
              total_time: resultTime
            },
            {
              where: {
                id: id,
                status: 0 // pending
              }
            }
          )
          .then(updated => {
            callback(null, {
              email: data.email,
              details: data.details,
              updated: updated
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function sendMail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Reimbursement Approval',
            to: data.email,
            data: {
              data: data.details
            },
            file: 'reimbursement_approval.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: '?',
            message: 'Proses approval reimbursement berhasil',
            data: data.updated
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: '?',
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

exports.finishingRequest = (APP, req, callback) => {
  let { reimbursement, employee } = APP.models.company[req.user.db].mysql;
  let { status, id } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        // if (!status)
        // return callback({
        //     code: 'INVALID_REQUEST',
        //     message: 'Kesalahan pada parameter status!'
        // });

        // if (!notes)
        // return callback({
        //     code: 'INVALID_REQUEST',
        //     message: 'Kesalahan pada parameter notes!'
        // });

        if (!id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });

        callback(null, true);
      },

      function getCurretData(data, callback) {
        reimbursement
          .findOne({
            where: {
              id: id,
              status: {
                $not: 0
              }
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Data Tidak ditemukan'
              });
            } else {
              callback(null, res.dataValues);
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function getRequesterEmail(data, callback) {
        employee
          .findOne({
            where: {
              id: data.created_by
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Employee Tidak ditemukan'
              });
            } else {
              callback(null, {
                details: data,
                email: res.dataValues.email
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function uploadPath(data, callback) {
        try {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback(null, data);
          }

          APP.fileCheck(req.files.upload.tempFilePath, 'all').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/employee/reimbursement/`;

              callback(null, {
                details: data.details,
                email: data.email,
                doc: docPath + fileName + path.extname(req.files.upload.name)
              });
            }
          });
        } catch (err) {
          console.log('Error uploadPath', err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function uploadProcess(data, callback) {
        try {
          // upload file
          if (data.doc) {
            APP.cdn.uploadCDN(req.files.upload, data.doc).then(res => {
              if (res.error == true) {
                callback({
                  code: 'ERR',
                  data: res.data
                });
              } else {
                callback(null, data);
              }
            });
          } else {
            callback(null, data);
          }
        } catch (err) {
          console.log('Error uploadProcess', err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function finishingRequest(data, callback) {
        let diff = moment.utc(moment().diff(moment(data.details.approved_at))).format('HH:mm:ss'),
          total = APP.time.timeDuration([diff, data.details.total_time]);

        reimbursement
          .update(
            {
              status: 3, // complete
              upload_feedback: data.doc ? data.doc.slice(8) : null,
              updated_by: req.user.id,
              updated_at: new Date(),
              total_time: total
            },
            {
              where: {
                id: id,
                status: {
                  $not: 0
                }
              }
            }
          )
          .then(updated => {
            callback(null, {
              email: data.email,
              details: data.details,
              updated: updated
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
            });
          });
      },

      function sendMail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Reimbursement Approval',
            to: data.email,
            data: {
              data: data.details
            },
            file: 'reimbursement_approval.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: '?',
            message: 'Proses approval reimbursement berhasil',
            data: data.updated
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: '?',
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
