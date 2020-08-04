'use strict';

const async = require('async');
const path = require('path');

exports.get = (APP, req, callback) => {
  let { services } = APP.models.company[req.user.db].mysql;

  services
    .findAll({
      where: {
        status: 1
      }
    })
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

exports.getById = (APP, req, callback) => {
  let { services } = APP.models.company[req.user.db].mysql;

  services
    .findOne({
      where: {
        id: req.body.id,
        status: 1
      }
    })
    .then(res => {
      callback(null, {
        code: res ? 'FOUND' : 'NOT_FOUND',
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
  let { services } = APP.models.company[req.user.db].mysql;
  let { name, desc, step, requirement, sla } = req.body;

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

        if (!step)
          // comma separated value
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter step!'
          });

        if (!requirement)
          // comma separated value
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter requirement!'
          });

        if (!sla)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter sla!'
          });

        callback(null, true);
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(services, 'SRV');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
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
            console.log('masuk sini');
            return callback(null, data);
          }

          APP.fileCheck(req.files.upload.tempFilePath, 'doc').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/services/`;

              callback(null, {
                code: data.code,
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

      function createNewServices(data, callback) {
        let params = {
          code: data.code,
          name: name,
          description: desc,
          step: step,
          requirement: requirement,
          sla: sla,
          action_by: req.user.id
        };

        data.doc ? (params.document = data.doc.slice(8)) : null;

        services
          .create(params)
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              message: 'Service berhasil ditambahkan!',
              data: res
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
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
  let { services } = APP.models.company[req.user.db].mysql;
  let { id, name, desc, step, requirement, status } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (!id)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });

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

        if (!step)
          // comma separated value
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter step!'
          });

        if (!requirement)
          // comma separated value
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter requirement!'
          });

        if (!status)
          return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter status!'
          });

        callback(null, true);
      },

      function uploadPath(data, callback) {
        try {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback(null, data);
          }

          APP.fileCheck(req.files.upload.tempFilePath, 'doc').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let docPath = `./public/uploads/company_${req.user.code}/services/`;

              callback(null, {
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

      function updateServices(data, callback) {
        let params = {
          name: name,
          description: desc,
          step: step,
          requirement: requirement,
          updated_at: new Date(),
          action_by: req.user.id
        };

        data.doc ? (params.document = data.doc.slice(8)) : null;

        services
          .update(params, {
            where: {
              id: id
            }
          })
          .then(res => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              message: 'Service berhasil diubah!',
              data: res
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
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

exports.delete = function(APP, req, callback) {
  let { services, services_request } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkBody(callback) {
        if (req.user.level === 2) {
          if (req.body.id) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: '?',
              message: 'Kesalahan pada parameter id'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid User level'
          });
        }
      },

      // function checkServicesRequest(data, callback) {
      //   services_request
      //     .findAll({
      //       where: {
      //         services_id: req.body.id,
      //         status: {
      //             $not: "0"
      //         }
      //       }
      //     })
      //     .then(res => {
      //       if (res.length == 0) {
      //         callback(null, true);
      //       } else {
      //         callback({
      //           code: 'INVALID_REQUEST',
      //           id: '',
      //           message: 'Terdapat request aktif sedang mengunakan services ini!'
      //         });
      //       }
      //     })
      //     .catch(err => {
      //       console.log(err);
      //       callback({
      //         code: 'ERR_DATABASE',
      //         id: '?',
      //         message: '?',
      //         data: err
      //       });
      //     });
      // },

      function softDeleteServices(data, callback) {
        services
          .update(
            {
              status: 0
            },
            {
              where: {
                id: req.body.id
              }
            }
          )
          .then(updated => {
            if (updated.length == 0)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Services tidak ditemukan!'
              });

            callback(null, {
              code: 'DELETE_SUCCESS',
              id: '?',
              message: '',
              data: updated
            });
          })
          .catch(err => {
            console.log(err);
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
