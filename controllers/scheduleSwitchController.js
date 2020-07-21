'use strict';

const async = require('async');

exports.get = (APP, req, callback) => {
  let where = '1+1'; // default

  if (req.user.level == 3) {
    where = `sw.user_id = ${req.user.id} OR sw.target_user_id = ${req.user.id}`;
  }

  let query = `
        SELECT 
            sw.*, 
            emp1.name 'employee_name',
            emp1.nik 'employee_nik',
            emp1.photo 'employee_photo',
            emp2.name 'employee_target_name',
            emp2.nik 'employee_target_nik',
            emp2.photo 'employee_target_photo',
        CASE WHEN 
            sw.user_id = ${req.user.id} THEN 1 ELSE 2 
        END
        AS
          'requester'
        FROM 
            ${req.user.db}.schedule_switch sw
        INNER JOIN
            ${req.user.db}.employee emp1
        ON
            emp1.id = sw.user_id
        LEFT JOIN
            ${req.user.db}.employee emp2
        ON
            emp2.id = sw.target_user_id
        WHERE
            ${where}`;

  APP.db.sequelize
    .query(query)
    .then(res => {
      callback(null, {
        code: res[0].length == 0 ? 'NOT_FOUND' : 'FOUND',
        data: res[0]
      });
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR',
        data: err
      });
    });
};

exports.getById = (APP, req, callback) => {
  if (!req.body.id) {
    return callback({
      code: 'INVALID_REQUEST',
      message: 'Kesalahan pada parameter id!'
    });
  }

  let where = `sw.id = ${req.body.id}`; // default

  if (req.user.level == 3) {
    where = `sw.id = ${req.body.id} AND (sw.user_id = ${req.user.id} OR sw.target_user_id = ${req.user.id})`;
  }

  let query = `
        SELECT 
            sw.*, 
            emp1.name 'employee_name',
            emp1.nik 'employee_nik',
            emp1.photo 'employee_photo',
            emp2.name 'employee_target_name',
            emp2.nik 'employee_target_nik',
            emp2.photo 'employee_target_photo',
        CASE WHEN 
            sw.user_id = ${req.user.id} THEN 1 ELSE 2 
        END
        AS
          'requester'
        FROM 
            ${req.user.db}.schedule_switch sw
        INNER JOIN
            ${req.user.db}.employee emp1
        ON
            emp1.id = sw.user_id
        LEFT JOIN
            ${req.user.db}.employee emp2
        ON
            emp2.id = sw.target_user_id
        WHERE
            ${where}`;

  APP.db.sequelize
    .query(query)
    .then(res => {
      callback(null, {
        code: res[0].length == 0 ? 'NOT_FOUND' : 'FOUND',
        data: res[0][0]
      });
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR',
        data: err
      });
    });
};

exports.insert = (APP, req, callback) => {
  let { schedule_switch, schedule, employee } = APP.models.company[req.user.db].mysql;
  let { name, desc, nik, date } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!desc)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter desc!'
          });

        if (!nik)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter nik!'
          });

        if (!date)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter date!'
          });

        callback(null, true);
      },

      function checkTargetEmployee(data, callback) {
        employee
          .findOne({
            attributes: ['id', 'nik', 'name', 'photo', 'email', 'schedule_id'],
            where: { nik: nik }
          })
          .then(res => {
            if (res == null) return callback({ code: 'NOT_FOUND', message: 'Employee tidak ditemukan!' });

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
        let kode = APP.generateCode(schedule_switch, 'SSR');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              target: data,
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

      function switchRequest(data, callback) {
        console.log(data.code);

        schedule_switch
          .create({
            user_id: req.user.id,
            target_user_id: data.target.id,
            code: data.code,
            name: name,
            description: desc,
            date: date,
            created_by: req.user.id
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Berhasil melakukan switch schedule!',
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.updateStatus = (APP, req, callback) => {
  let { schedule_switch, employee } = APP.models.company[req.user.db].mysql;
  let { status, target_status, target_date, notes, target_notes, id } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (req.user.level == 2) {
          if (!status)
            return callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter status!'
            });

          if (!notes)
            return callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter notes!'
            });
        }

        if (req.user.level == 3) {
          if (!target_status)
            return callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter target_status!'
            });

          if (!target_notes)
            return callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter notes!'
            });

          if (!target_date)
            return callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter target_date!'
            });
        }

        if (!id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });

        callback(null, true);
      },

      function getCurrentData(data, callback) {
        schedule_switch
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
              if (req.user.level == 3) {
                if (res.target_user_id !== req.user.id)
                  return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid user!'
                  });

                if (res.target_user_status !== 1)
                  return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Belum mendapat persetujuan employee yang dituju!'
                  });
              }

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
        schedule_switch
          .update(
            {
              status: status,
              notes: notes,
              target_notes: target_notes,
              target_user_status: target_status,
              target_user_date: target_date,
              approved_by: req.user.level == 2 ? req.user.id : null,
              approved_at: req.user.level == 2 ? new Date() : null
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

      function sendMail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Services Approval',
            to: data.email,
            data: {
              data: data.details
            },
            file: 'services_approval.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            id: '?',
            message: 'Proses approval switch schedule berhasil',
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
