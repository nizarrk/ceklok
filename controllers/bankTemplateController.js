'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');

exports.get = (APP, req, callback) => {
  let start = req.body.datestart + ' 00:00:00';
  let end = req.body.dateend + ' 23:59:59';
  console.log(req.body);

  let where =
    req.body.datestart && req.body.dateend ? `WHERE a.created_at BETWEEN '${start}' AND '${end}'` : 'WHERE 1 + 1';

  console.log(where);

  if (req.user.level === 2 || req.user.level === 3) {
    APP.db.sequelize
      .query(
        `SELECT 
          a.id, a.code, a.name, a.description, a.grade_id, a.user_type_id, 
          a.upload, a.status, a.created_at, a.updated_at, a.action_by, 
          b.name AS 'admin_name', c.name AS 'user_type_name', d.name AS 'grade_name'
        FROM 
          ${req.user.db}.bank_template 
        AS 
          a
        LEFT OUTER JOIN 
          ceklok.admin 
        AS 
          b 
        ON 
          a.action_by = b.id
        LEFT OUTER JOIN 
          ${req.user.db}.user_type 
        AS 
          c 
        ON 
          a.user_type_id = c.id
        LEFT OUTER JOIN 
          ${req.user.db}.grade 
        AS 
          d 
        ON 
          a.grade_id = d.id
        ${where}`
      )
      .then(res => {
        if (res[0].length == 0) {
          callback({
            code: 'NOT_FOUND',
            message: 'Bank template tidak ditemukan'
          });
        } else {
          callback(null, {
            code: 'FOUND',
            data: res[0]
          });
        }
      })
      .catch(err => {
        console.log(err);
        callback({
          code: 'ERR_DATABASE',
          data: err
        });
      });
  } else {
    callback({
      code: 'INVALID_REQUEST',
      message: 'Invalid user level'
    });
  }
};

exports.insert = (APP, req, callback) => {
  let { bank_template, grade, user_type } = APP.models.company[req.user.db].mysql;
  let { name, desc, grade_id, user_type_id } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && grade_id && user_type_id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'RNQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkGrade(data, callback) {
        grade
          .findOne({
            where: {
              id: grade_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Grade tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function checkUserType(data, callback) {
        user_type
          .findOne({
            where: {
              id: user_type_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'User type tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(bank_template, 'BT');
        new Promise(resolve => {
          resolve(kode);
        })
          .then(x => {
            callback(null, x);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'AKP01',
              message: 'Terjadi Kesalahan, mohon coba kembali'
            });
          });
      },

      function uploadPath(data, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
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
                let docPath = `./public/uploads/company_${req.user.code}/template/`;

                callback(null, {
                  code: data,
                  doc: docPath + fileName + path.extname(req.files.upload.name)
                });
              }
            });
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              data: err
            });
          }
        );
      },

      function insertBankTemplate(data, callback) {
        bank_template
          .create({
            code: data.code,
            user_type_id: user_type_id,
            grade_id: grade_id,
            name: name,
            description: desc,
            upload: data.doc.slice(8),
            action_by: req.user.id
          })
          .then(res => {
            if (req.files.upload) {
              req.files.upload.mv(data.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Bank Template Berhasil ditambahkan',
              data: res
            });
          })
          .catch(err => {
            console.log('Error insertBankTemplate', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error insertBankTemplate',
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

exports.update = (APP, req, callback) => {
  let { bank_template, grade, user_type } = APP.models.company[req.user.db].mysql;
  let { id, name, desc, grade_id, user_type_id } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && grade_id && user_type_id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'RNQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkGrade(data, callback) {
        grade
          .findOne({
            where: {
              id: grade_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Grade tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function checkUserType(data, callback) {
        user_type
          .findOne({
            where: {
              id: user_type_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'User type tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function checkCurrentData(data, callback) {
        bank_template
          .findOne({
            where: {
              id: id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Bank Template tidak ditemukan!'
              });
            } else {
              callback(null, res.upload);
            }
          });
      },

      function checkUpload(data, callback) {
        trycatch(
          () => {
            APP.fileCheck(req.files.upload.data, 'doc').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let docPath = `./public/uploads/company_${req.user.code}/template/`;

                callback(null, {
                  status: true,
                  doc: docPath + fileName + path.extname(req.files.upload.name)
                });
              }
            });
          },
          err => {
            callback(null, {
              status: false,
              doc: data
            });
          }
        );
      },

      function updateBankTemplate(data, callback) {
        bank_template
          .update(
            {
              user_type_id: user_type_id,
              grade_id: grade_id,
              name: name,
              description: desc,
              upload: data.status ? data.doc.slice(8) : data.doc,
              action_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(updated => {
            if (data.status) {
              req.files.upload.mv(data.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }
            callback(null, {
              code: 'UPDATE_SUCCESS',
              message: 'Berhasil melakukan update bank template',
              data: updated
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              message: '',
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
