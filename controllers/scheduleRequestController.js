'use strict';

const async = require('async');
const path = require('path');

exports.get = (APP, req, callback) => {
  let { schedule, schedule_request, employee } = APP.models.company[req.user.db].mysql;

  schedule_request.belongsTo(schedule, {
    targetKey: 'id',
    foreignKey: 'schedule_id'
  });

  schedule_request.belongsTo(employee, {
    targetKey: 'id',
    foreignKey: 'user_id'
  });

  employee.belongsTo(schedule, {
    targetKey: 'id',
    foreignKey: 'schedule_id'
  });

  schedule_request
    .findAll({
      include: [
        {
          model: schedule,
          attributes: ['id', 'name', 'description', 'type', 'work_time', 'work_day', 'total_work_time']
        },
        {
          model: employee,
          attributes: ['id', 'nik', 'name', 'photo'],
          include: [
            {
              model: schedule,
              attributes: ['id', 'name', 'description', 'type', 'work_time', 'work_day', 'total_work_time']
            }
          ]
        }
      ]
    })
    .then(res => {
      if (res.length == 0)
        return callback({
          code: 'NOT_FOUND',
          message: 'Data tidak ditemukan!'
        });

      callback(null, {
        code: 'FOUND',
        message: 'Data tidak ditemukan!',
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
  let { schedule, schedule_request, employee } = APP.models.company[req.user.db].mysql;
  let { name, desc, schedule_id } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!desc)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter desc!'
          });

        if (!schedule_id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter schedule_id!'
          });

        callback(null, true);
      },

      function checkCurrentSchedule(data, callback) {
        employee.belongsTo(schedule, {
          targetKey: 'id',
          foreignKey: 'schedule_id'
        });

        employee
          .findOne({
            include: [
              {
                model: schedule,
                attributes: ['id', 'name', 'description', 'type', 'total_work_time']
              }
            ],
            where: { id: req.user.id }
          })
          .then(res => {
            if (res == null)
              return callback({
                code: 'NOT_FOUND',
                message: 'Employee tidak ditemukan!'
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

      function checkschedule(data, callback) {
        if (data.schedule_id == schedule_id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Schedule tidak berubah!'
          });

        schedule
          .findOne({
            attributes: ['id', 'name', 'description', 'type', 'total_work_time'],
            where: {
              id: schedule_id
            }
          })
          .then(res => {
            console.log(res.total_work_time);
            console.log(data.schedule.total_work_time);

            if (res == null)
              return callback({
                code: 'NOT_FOUND',
                message: 'Schedule tidak ditemukan!'
              });

            if (res.type !== data.schedule.type)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Tipe schedule tidak sesuai!'
              });

            if (res.total_work_time !== data.schedule.total_work_time)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Total jam kerja tidak sama!'
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
        let kode = APP.generateCode(schedule_request, 'SCR');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              schedule: data,
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

      function requestSchedule(data, callback) {
        schedule_request
          .create({
            code: data.code,
            user_id: req.user.id,
            schedule_id: schedule_id,
            name: name,
            description: desc,
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
  let { schedule_request, schedule, employee } = APP.models.company[req.user.db].mysql;
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
        schedule_request.belongsTo(schedule, {
          targetKey: 'id',
          foreignKey: 'schedule_id'
        });

        schedule_request
          .findOne({
            include: [
              {
                model: schedule,
                attributes: ['id', 'name', 'description']
              }
            ],
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

      function uploadPath(data, callback) {
        try {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback(null, data);
          }

          APP.fileCheck(req.files.upload.data, 'all').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/employee/schedule/request/`;

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

      function updateApproval(data, callback) {
        schedule_request
          .update(
            {
              status: status,
              notes: notes,
              upload_feedback: data.doc ? data.doc.slice(8) : null,
              approved_by: req.user.id,
              approved_at: new Date()
            },
            {
              where: {
                id: id,
                status: 0 // pending
              }
            }
          )
          .then(updated => {
            // upload file
            if (req.files.upload) {
              req.files.upload.mv(data.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR',
                    data: err
                  });
              });
            }

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

      function updateEmployeeSchedule(data, callback) {
        employee
          .update(
            {
              schedule_id: data.details.schedule_id
            },
            {
              where: {
                id: data.details.user_id
              }
            }
          )
          .then(() => {
            callback(null, data);
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
            subject: 'Change Shift Approval',
            to: data.email,
            data: {
              data: data.details
            },
            file: 'change_shift_approval.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: '?',
            message: 'Proses approval change schedule berhasil',
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
