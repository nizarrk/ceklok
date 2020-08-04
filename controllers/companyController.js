'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');

exports.getListCompany = (APP, req, callback) => {
  let mysql = APP.models.mysql;
  let params = {};

  if (req.body.status || req.body.status === 0) {
    params.status = req.body.status;
  }

  if (req.body.datestart && req.body.dateend) {
    params.created_at = {
      $between: [req.body.datestart, req.body.dateend + ' 23:59:59']
    };
  }

  // add pricing to company
  mysql.company.belongsTo(mysql.pricing, {
    targetKey: 'id',
    foreignKey: 'pricing_id'
  });

  mysql.company
    .findAll({
      include: [
        {
          model: mysql.pricing,
          attributes: ['id', 'name', 'description']
        }
      ],
      where: params == {} ? 1 + 1 : params
    })
    .then(rows => {
      return callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    })
    .catch(err => {
      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getCompanyDetails = (APP, req, callback) => {
  let mysql = APP.models.mysql;
  let params = {};

  if (req.user.level == 2) {
    params.id = req.user.company;
  }

  if (req.user.level == 1) {
    params.id = req.body.id;
  }

  if (req.user.level !== 2 && req.user.level !== 1) {
    return callback({
      code: 'INVALID_REQUEST',
      message: 'Anda tidak memiliki akses ke fitur ini'
    });
  }

  // add pricing to company
  mysql.company.belongsTo(mysql.pricing, {
    targetKey: 'id',
    foreignKey: 'pricing_id'
  });

  mysql.company
    .findOne({
      include: [
        {
          model: mysql.pricing,
          attributes: ['id', 'name', 'description']
        }
      ],
      where: params ? params : 1 + 1
    })
    .then(res => {
      if (res == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Company tidak ditemukan'
        });
      }
      callback(null, {
        code: 'FOUND',
        data: res
      });
    });
};

exports.editCompanyProfile = (APP, req, callback) => {
  let mysql = APP.models.mysql;

  mysql.company
    .findOne({
      where: {
        id: req.user.company
      }
    })
    .then(res => {
      if (res == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'Company tidak ditemukan'
        });
      }

      res
        .update({
          established_date: req.body.established,
          name: req.body.name,
          description: req.body.desc,
          company_field: req.body.field,
          address: req.body.address,
          kelurahan: req.body.kel,
          kecamatan: req.body.kec,
          city: req.body.city,
          province: req.body.prov,
          zipcode: req.body.zip,
          msisdn: 'default',
          tlp: req.body.telp
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
            message: 'Error update',
            data: err
          });
        });
    })
    .catch(err => {
      console.log('Error findOne', err);
      callback({
        code: 'ERR_DATABASE',
        message: 'Error findOne',
        data: err
      });
    });
};

exports.editCompanyStatus = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        if (!req.body.status) {
          return callback({
            code: 'MISSING_KEY',
            message: 'Missing parameter status'
          });
        }

        if (!req.body.id) {
          return callback({
            code: 'MISSING_KEY',
            message: 'Missing parameter id'
          });
        }

        callback(null, true);
      },

      function uploadPath(result, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                message: 'No files were uploaded.'
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
                let docPath = `./public/uploads/company_${req.user.code}/status/`;

                // if (!fs.existsSync(docPath)) {
                //   mkdirp.sync(docPath);
                // }

                callback(null, docPath + fileName + path.extname(req.files.upload.name));
              }
            });
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              message: 'Error upload data',
              data: err
            });
          }
        );
      },

      function uploadProcess(result, callback) {
        try {
          // upload file
          if (req.files.upload) {
            APP.cdn.uploadCDN(req.files.upload, result).then(res => {
              if (res.error == true) {
                callback({
                  code: 'ERR',
                  data: res.data
                });
              } else {
                callback(null, result);
              }
            });
          } else {
            callback(null, result);
          }
        } catch (err) {
          console.log('Error uploadProcess', err);
          callback({
            code: 'ERR',
            data: err
          });
        }
      },

      function updateStatus(result, callback) {
        let mysql = APP.models.mysql;

        mysql.company
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Company tidak ditemukan'
              });
            }

            res
              .update({
                status: req.body.status,
                status_upload: result.slice(8) // slice 8 untuk hilangin ./public
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
                  message: 'Error update',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error findOne', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error findOne',
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
