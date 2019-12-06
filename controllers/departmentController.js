'use strict';

const async = require('async');

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to get data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.get = function(APP, req, callback) {
  APP.models.mysql.department
    .findAll()
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
        data: JSON.stringify(err)
      });
    });
};

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to insert data to MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.insert = function(APP, req, callback) {
  async.waterfall(
    [
      function generateDepartmentCode(callback) {
        let pad = 'DEP-000';
        let kode = '';

        APP.models.mysql.department
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
              console.log(res[0].department_code);

              let lastID = res[0].department_code;
              let replace = lastID.replace('DEP-', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
            }
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function insertDepartment(result, callback) {
        APP.models.mysql.department
          .build({
            department_code: result,
            name: req.body.name,
            description: req.body.desc,
            location: req.body.loc
          })
          .save()
          .then(result => {
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, {
              code: 'INSERT_SUCCESS',
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
              data: JSON.stringify(err)
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

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to update data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.update = function(APP, req, callback) {
  APP.models.mysql.department
    .update(
      {
        name: req.body.name,
        description: req.body.desc,
        location: req.body.loc
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      if (!result || (result && !result[0])) {
        let params = 'No data updated'; //This is only example, Object can also be used
        return callback(null, {
          code: 'UPDATE_NONE',
          data: params
        });
      }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        data: params
      });
    })
    .catch(err => {
      console.log('iki error', err);

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
        data: JSON.stringify(err)
      });
    });
};

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to delete data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.mysql.department
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
        data: JSON.stringify(err)
      });
    });
};