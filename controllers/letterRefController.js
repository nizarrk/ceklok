'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');

exports.get = (APP, req, callback) => {
  let { letter_ref, letter } =
    req.user.level === 2
      ? APP.models.company[req.user.db].mysql
      : callback({
          code: 'NOT_FOUND',
          message: 'Invalid user level'
        });

  letter_ref.belongsTo(letter, {
    targetKey: 'id',
    foreignKey: 'letter_id'
  });

  async.waterfall(
    [
      function getAll(callback) {
        letter_ref
          .findAll({
            include: [
              {
                model: letter,
                attributes: ['id', 'name', 'description', 'letter_code'],
                required: false
              }
            ]
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Nomor surat tidak ditemukan!'
              });
            } else {
              callback(null, res);
            }
          });
      },

      function getApprovedRequest(data, callback) {
        APP.db.sequelize
          .query(
            `SELECT 
            a.id, a.code, a.name, a.description, a.reference, a.created_at, a.action_by, a.approved_at, 
            a.approved_by, b.id AS 'letter_id', b.code AS 'code_leter', b.letter_code, b.name AS 'letter_name', b.description AS
            'letter_description', c.id AS 'admin_id', c.name AS 'admin_name' 
          FROM 
            ${req.user.db}.letter_ref AS a
          JOIN 
            ${req.user.db}.letter
          AS 
            b
          ON 
            a.letter_id = b.id
          JOIN 
            ceklok.admin
          AS 
            c
          ON 
            a.approved_by = c.id`
          )
          .then(res => {
            callback(null, {
              all: data,
              approved: res[0]
            });
          });
      },

      function getPendingRequest(data, callback) {
        letter_ref
          .findAll({
            include: [
              {
                model: letter,
                attributes: ['id', 'name', 'description', 'letter_code']
              }
            ],

            where: {
              status: 0
            }
          })
          .then(res => {
            callback(null, {
              code: 'FOUND',
              data: {
                all: data.all,
                approved: data.approved,
                pending: res
              }
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

exports.insert = (APP, req, callback) => {
  let { letter_ref, letter } = APP.models.company[req.user.db].mysql;
  let { name, desc, letter_id } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && letter_id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'RNQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkLetter(data, callback) {
        letter
          .findOne({
            where: {
              id: letter_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Kode surat tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(letter_ref, 'RN');
        Promise.resolve(kode)
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

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let docPath = `./public/uploads/company_${req.user.code}/letter/`;

            callback(null, {
              code: data,
              doc: docPath + fileName + path.extname(req.files.upload.name)
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

      function insertLetterRef(data, callback) {
        letter_ref
          .create({
            code: data.code,
            letter_id: letter_id,
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
              message: 'Nomor Surat Berhasil ditambahkan!',
              data: res
            });
          })
          .catch(err => {
            console.log('Error insertLetterRef', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error insertLetterRef',
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
  let { id, status } = req.body;
  async.waterfall(
    [
      function checkParams(callback) {
        if (id && status) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function updateStatus(data, callback) {
        if (req.user.level === 2) {
          let { letter_ref, letter } = APP.models.company[req.user.db].mysql;

          letter_ref.belongsTo(letter, {
            targetKey: 'id',
            foreignKey: 'letter_id'
          });

          letter_ref
            .findOne(
              {
                include: [
                  {
                    model: letter,
                    attributes: ['id', 'name', 'description', 'letter_code']
                  }
                ]
              },
              {
                where: {
                  id: id
                }
              }
            )
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Nomor surat tidak ditemukan!'
                });
              } else {
                res
                  .update({
                    status: status,
                    reference: status == 1 ? res.letter.letter_code + res.code.replace('RN', '') : '',
                    approved_by: req.user.id,
                    approved_at: new Date()
                  })
                  .then(updated => {
                    callback(null, {
                      code: 'UPDATE_SUCCESS',
                      data: updated
                    });
                  })
                  .catch(err => {
                    console.log('Error update', err);
                    callback({
                      code: 'ERR_DATABASE',
                      data: err
                    });
                  });
              }
            })
            .catch(err => {
              console.log('Error findOne', err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        } else {
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Invalid user level'
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
