'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');

exports.get = function(APP, req, callback) {
  async.waterfall(
    [
      function getBenefit(callback) {
        APP.models.company[req.user.db].mysql.benefit
          .findAll()
          .then(rows => {
            callback(null, rows);
          })
          .catch(err => {
            return callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function getCustomBenefit(result, callback) {
        APP.models.company[req.user.db].mysql.benefit_custom
          .findAll()
          .then(rows => {
            if (result.length == 0 && rows.length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Benefit dan Custom Benefit tidak ditemukan',
                data: {
                  benefit: [],
                  custom: []
                }
              });
            }
            callback(null, {
              code: 'FOUND',
              data: {
                benefit: result,
                custom: rows
              }
            });
          })
          .catch(err => {
            return callback({
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

exports.insert = function(APP, req, callback) {
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'B000';
        let kode = '';

        APP.models.company[req.user.db].mysql.benefit
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              kode = pad.substring(0, pad.length - str.length) + str;

              callback(null, kode);
            } else {
              console.log('ada');
              console.log(res[0].code);

              let lastID = res[0].code;
              let replace = lastID.replace('B', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
            }
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function insertBenefit(result, callback) {
        APP.models.company[req.user.db].mysql.benefit
          .build({
            code: result,
            name: req.body.name,
            description: req.body.desc
          })
          .save()
          .then(result => {
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Benefit berhasil ditambahkan!',
              data: result.dataValues || params
            });
          })
          .catch(err => {
            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                data: params
              });
            }

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                data: params
              });
            }

            return callback({
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

exports.customInsert = function(APP, req, callback) {
  async.waterfall(
    [
      function uploadPath(callback) {
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
                let docPath = `./public/uploads/company_${req.user.code}/employee/benefit/`;

                callback(null, {
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

      function insertCustomBenefit(data, callback) {
        APP.models.company[req.user.db].mysql.benefit_custom
          .build({
            employee_id: req.body.user,
            name: req.body.name,
            description: req.body.desc,
            upload: data.doc.slice(8) // slice 8 buat ngilangin './public'
          })
          .save()
          .then(result => {
            // upload file
            if (req.files.upload) {
              req.files.upload.mv(data.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Custom Benefit berhasil ditambahkan!',
              data: result.dataValues || params
            });
          })
          .catch(err => {
            console.log(err);

            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                data: params
              });
            }

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                data: params
              });
            }

            return callback({
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

exports.update = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.benefit
    .update(
      {
        name: req.body.name,
        description: req.body.desc,
        status: req.body.status
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      // if (!result || (result && !result[0])) {
      //   let params = 'No data updated'; //This is only example, Object can also be used
      //   return callback(null, {
      //     code: 'UPDATE_NONE',
      //     data: params
      //   });
      // }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        message: 'Benefit berhasil diubah!',
        data: result
      });
    })
    .catch(err => {
      console.log('iki error', err);

      // if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
      //   let params = 'Error! Empty Query'; //This is only example, Object can also be used
      //   return callback({
      //     code: 'UPDATE_NONE',
      //     data: params
      //   });
      // }

      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
        return callback({
          code: 'DUPLICATE',
          data: params
        });
      }

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.updateStatus = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.benefit
    .update(
      {
        status: req.body.status
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      // if (!result || (result && !result[0])) {
      //   let params = 'No data updated'; //This is only example, Object can also be used
      //   return callback(null, {
      //     code: 'UPDATE_NONE',
      //     data: params
      //   });
      // }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        message: 'Benefit berhasil diubah!',
        data: result
      });
    })
    .catch(err => {
      console.log('iki error', err);

      // if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
      //   let params = 'Error! Empty Query'; //This is only example, Object can also be used
      //   return callback({
      //     code: 'UPDATE_NONE',
      //     data: params
      //   });
      // }

      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
        return callback({
          code: 'DUPLICATE',
          data: params
        });
      }

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.updateCustom = function(APP, req, callback) {
  APP.models.mysql.benefit_custom
    .update(
      {
        name: req.body.name,
        description: req.body.desc
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      // if (!result || (result && !result[0])) {
      //   let params = 'No data updated'; //This is only example, Object can also be used
      //   return callback(null, {
      //     code: 'UPDATE_NONE',
      //     data: params
      //   });
      // }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        message: 'Custom Benefit berhasil ditambahkan!',
        data: params
      });
    })
    .catch(err => {
      if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
        let params = 'Error! Empty Query'; //This is only example, Object can also be used
        return callback({
          code: 'UPDATE_NONE',
          data: params
        });
      }

      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
        return callback({
          code: 'DUPLICATE',
          data: params
        });
      }

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.company[req.user.db].mysql.benefit
    .destroy(params)
    .then(deleted => {
      if (!deleted)
        return callback(null, {
          code: 'DELETE_NONE',
          data: params.where
        });

      return callback(null, {
        code: 'DELETE_SUCCESS',
        data: params.where
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.deleteCustom = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.company[req.user.db].mysql.benefit_custom
    .destroy(params)
    .then(deleted => {
      if (!deleted)
        return callback(null, {
          code: 'DELETE_NONE',
          data: params.where
        });

      return callback(null, {
        code: 'DELETE_SUCCESS',
        data: params.where
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};
