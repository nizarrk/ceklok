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

  APP.db.sequelize
    .query(
      `SELECT 
      a.id, a.code, a.name, a.description, a.grade_id, a.user_type_id, 
      a.upload, a.download_count, a.status, a.created_at, a.updated_at, a.created_by, a.updated_by, 
      b.name AS 'creator_name', b2.name AS 'updater_name', c.name AS 'user_type_name', d.name AS 'grade_name'
    FROM 
      ${req.user.db}.bank_template 
    AS 
      a
    LEFT OUTER JOIN 
      ${process.env.MYSQL_NAME}.admin 
    AS 
      b 
    ON 
      a.created_by = b.id
    LEFT OUTER JOIN 
      ${process.env.MYSQL_NAME}.admin 
    AS 
      b2
    ON 
      a.updated_by = b2.id
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
};

exports.getById = (APP, req, callback) => {
  APP.db.sequelize
    .query(
      `SELECT 
      a.id, a.code, a.name, a.description, a.grade_id, a.user_type_id, 
      a.upload, a.download_count, a.status, a.created_at, a.updated_at, a.created_by, a.updated_by, 
      b.name AS 'creator_name', b2.name AS 'updater_name', c.name AS 'user_type_name', d.name AS 'grade_name'
    FROM 
      ${req.user.db}.bank_template 
    AS 
      a
    LEFT OUTER JOIN 
      ${process.env.MYSQL_NAME}.admin 
    AS 
      b 
    ON 
      a.created_by = b.id
    LEFT OUTER JOIN 
      ${process.env.MYSQL_NAME}.admin 
    AS 
      b2
    ON 
      a.updated_by = b2.id
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
    WHERE
      a.id = ${req.body.id}`
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
          data: res[0][0]
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
                code: 'INVALID_REQUEST',
                message: 'No files were uploaded.'
              });
            }

            APP.fileCheck(req.files.upload.tempFilePath, 'doc').then(res => {
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

      function insertBankTemplate(data, callback) {
        bank_template
          .create({
            code: data.code,
            user_type_id: user_type_id,
            grade_id: grade_id,
            name: name,
            description: desc,
            upload: data.doc.slice(8),
            download_count: 0,
            created_by: req.user.id
          })
          .then(res => {
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
            APP.fileCheck(req.files.upload.tempFilePath, 'doc').then(res => {
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

      function uploadProcess(data, callback) {
        try {
          // upload file
          if (data.status) {
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

      function updateBankTemplate(data, callback) {
        bank_template
          .update(
            {
              user_type_id: user_type_id,
              grade_id: grade_id,
              name: name,
              description: desc,
              upload: data.status ? data.doc.slice(8) : data.doc,
              updated_by: req.user.id,
              updated_at: new Date()
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(updated => {
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

exports.updateDownloadCount = (APP, req, callback) => {
  let { bank_template } = APP.models.company[req.user.db].mysql;

  async.waterfall(
    [
      function getCurrentData(callback) {
        bank_template
          .findOne({
            attributes: ['id', 'download_count'],
            where: { id: req.body.id }
          })
          .then(res => {
            callback(null, res.dataValues);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              message: '',
              data: err
            });
          });
      },

      function updateCount(data, callback) {
        bank_template
          .update(
            {
              download_count: parseInt(data.download_count) + 1
            },
            {
              where: { id: req.body.id }
            }
          )
          .then(res => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: res
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
