'use strict';

const async = require('async');

exports.get = (APP, req, callback) => {
  let { letter, department } = APP.models.company[req.user.db].mysql;

  letter.belongsTo(department, {
    targetKey: 'id',
    foreignKey: 'department_id'
  });

  letter
    .findAll({
      include: [
        {
          model: department,
          attributes: ['id', 'name', 'description']
        }
      ]
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          id: 'LKQ97',
          message: 'Data Tidak ditemukan'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          id: 'LKP00',
          message: 'Data Kode Surat ditemukan',
          data: res
        });
      }
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        id: 'LKQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
      });
    });
};

exports.getById = (APP, req, callback) => {
  let { letter, department } = APP.models.company[req.user.db].mysql;

  letter.belongsTo(department, {
    targetKey: 'id',
    foreignKey: 'department_id'
  });

  letter
    .findOne(
      {
        include: [
          {
            model: department,
            attributes: ['id', 'name', 'description']
          }
        ]
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(res => {
      if (res == null) {
        callback({
          code: 'NOT_FOUND',
          id: 'LKQ97',
          message: 'Data Tidak ditemukan'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          id: 'LKP00',
          message: 'Data Kode Surat ditemukan',
          data: res
        });
      }
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        id: 'LKQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: err
      });
    });
};

exports.insert = (APP, req, callback) => {
  let { letter, department } = APP.models.company[req.user.db].mysql;
  let { department_id, code, name, desc } = req.body;

  async.waterfall(
    [
      function checkParams(callback) {
        if (department_id && name && desc) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'AKQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkDepartment(data, callback) {
        department
          .findOne({
            where: {
              id: department_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'AKQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              callback(null, true);
            }
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(letter, 'L');
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

      function insertKodeSurat(data, callback) {
        letter
          .create({
            code: data,
            letter_code: code,
            department_id: department_id,
            name: name,
            description: desc
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'AKP00',
              message: 'Data kode surat berhasil ditambahkan',
              data: res
            });
          })
          .catch(err => {
            console.log('Error InsertKodeSurat', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'AKQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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
  let { letter } = APP.models.company[req.user.db].mysql;
  let { id, name, desc, status } = req.body;

  async.waterfall(
    [
      // function checkParams(callback) {
      //     if (id && name && desc && status) {
      //         callback(null, true);
      //     } else {
      //         callback({
      //             code: 'INVALID_REQUEST',
      //             id: 'EKQ96',
      //             message: 'Kesalahan pada parameter'
      //         })
      //     }
      // },

      function updateLetterCode(result, callback) {
        letter
          .findOne({
            where: id
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'EKQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              res
                .update({
                  name: name,
                  description: desc,
                  status: status
                })
                .then(updated => {
                  callback(null, {
                    code: 'UPDATE_SUCESS',
                    id: 'EKP00',
                    message: 'Data Kode Surat berhasil diupdate'
                  });
                })
                .catch(err => {
                  console.log('Error update', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'EKQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            }
          })
          .catch(err => {
            console.log('Error findOne', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'EKQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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
