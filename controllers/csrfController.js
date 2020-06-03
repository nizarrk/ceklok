'use strict';

(exports.get = (APP, req, callback) => {
  let { api_priviledge } = APP.models.mysql;

  api_priviledge
    .findAll()
    .then(res => {
      console.log(res);

      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          message: 'Data tidak ditemukan!'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          message: 'Data ditemukan!',
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
}),
  (exports.getById = (APP, req, callback) => {
    let { api_priviledge } = APP.models.mysql;

    api_priviledge
      .findOne({
        where: {
          priviledge_key: req.body.key
        }
      })
      .then(res => {
        if (res == null) {
          callback({
            code: 'NOT_FOUND',
            message: 'Data tidak ditemukan!'
          });
        } else {
          callback(null, {
            code: 'FOUND',
            message: 'Data ditemukan!',
            data: req.csrfToken()
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
  });
