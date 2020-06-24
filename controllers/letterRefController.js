'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');

exports.get = (APP, req, callback) => {
  let { letter_ref, letter, department } = APP.models.company[req.user.db].mysql;
  let { admin } = APP.models.mysql;
  let query = {};

  if (req.body.status)
    query = {
      status: req.body.status
    };

  if (req.body.datestart && req.body.dateend)
    query = {
      created_at: { $between: [req.body.datestart, req.body.dateend] }
    };

  if (req.body.datestart && req.body.dateend && req.body.status)
    query = {
      status: req.body.status,
      created_at: { $between: [req.body.datestart, req.body.dateend] }
    };

  letter_ref.belongsTo(letter, {
    targetKey: 'id',
    foreignKey: 'letter_id'
  });

  letter.belongsTo(department, {
    targetKey: 'id',
    foreignKey: 'department_id'
  });

  letter_ref.belongsTo(admin, {
    targetKey: 'id',
    foreignKey: 'approved_by'
  });

  console.log(query);

  letter_ref
    .findAll({
      include: [
        {
          model: letter,
          attributes: ['id', 'name', 'description', 'letter_code'],
          required: false,
          include: [
            {
              model: department,
              attributes: ['id', 'name', 'description']
            }
          ]
        },
        {
          model: admin,
          attributes: ['id', 'name']
        }
      ],
      where: query
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          message: 'Nomor surat tidak ditemukan!'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          data: res
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
  let { letter_ref, letter, department } = APP.models.company[req.user.db].mysql;
  let { admin } = APP.models.mysql;

  letter_ref.belongsTo(letter, {
    targetKey: 'id',
    foreignKey: 'letter_id'
  });

  letter.belongsTo(department, {
    targetKey: 'id',
    foreignKey: 'department_id'
  });

  letter_ref.belongsTo(admin, {
    targetKey: 'id',
    foreignKey: 'approved_by'
  });

  letter_ref
    .findOne({
      include: [
        {
          model: letter,
          attributes: ['id', 'name', 'description', 'letter_code'],
          required: false,
          include: [
            {
              model: department,
              attributes: ['id', 'name', 'description']
            }
          ]
        },
        {
          model: admin,
          attributes: ['id', 'name']
        }
      ],
      where: { id: req.body.id }
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          message: 'Nomor surat tidak ditemukan!'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          data: res
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
                code: 'INVALID_REQUEST',
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
                let docPath = `./public/uploads/company_${req.user.code}/letter/`;

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

      function insertLetterRef(data, callback) {
        letter_ref
          .create({
            code: data.code,
            letter_id: letter_id,
            name: name,
            description: desc,
            upload: data.doc.slice(8),
            created_by: req.user.id
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
