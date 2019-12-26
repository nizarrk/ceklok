'use strict';

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to get data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.grade
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
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.getById = (APP, req, callback) => {
  APP.models.company[req.user.db].mysql.grade
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows === null) {
        return callback({
          code: 'NOT_FOUND'
        });
      }

      let len = 0;
      let benefit = [];
      let arr = rows.benefit_id.split(',');

      arr.map(res => {
        APP.models.company[req.user.db].mysql.benefit
          .findOne({
            where: {
              id: res
            }
          })
          .then(result => {
            benefit.push(result);
            len++;
            if (len === arr.length) {
              rows.dataValues.benefit = benefit;
              callback(null, {
                code: 'OK',
                data: rows
              });
            }
          })
          .catch(err => {
            console.log(err);
          });
      });
    })
    .catch(err => {
      console.log(err);
      callback({
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
  APP.models.company[req.user.db].mysql.grade
    .build({
      name: req.body.name,
      description: req.body.desc,
      benefit_id: req.body.benefit
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
};

/**
 * The model name `example` based on the related file in `/models` directory.
 *
 * There're many ways to update data from MySql with `Sequelize`,
 * please check `Sequelize` documentation.
 */
exports.update = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.grade
    .update(
      {
        benefit_id: req.body.benefit,
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
  APP.models.company[req.user.db].mysql.grade
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
