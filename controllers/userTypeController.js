'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  let { user_type } = APP.models.mysql;
  user_type
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
        data: err
      });
    });
};

exports.createUserType = function(APP, req, callback) {
  let { user_type, user_type_feature } = APP.models.mysql;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function generateCode(callback) {
          let pad = 'PRV000';
          let kode = '';

          user_type
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
                let replace = lastID.replace('PRV', '');
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

        function insertUserType(result, callback) {
          user_type
            .build(
              {
                code: result,
                name: req.body.name,
                description: req.body.desc
              },
              { transaction: t }
            )
            .save()
            .then(res => {
              let params = 'Insert Success'; //This is only example, Object can also be used
              return callback(null, res.dataValues);
            })
            .catch(err => {
              console.log('Error insertUserType', err);

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
                message: 'Error insertUserType',
                data: err
              });
            });
        },

        function insertUserTypeFeature(result, callback) {
          let subfeature = req.body.subfeature.split(',');
          let arr = [];

          subfeature.map(id => {
            let obj = {
              user_type_id: result.id,
              subfeature_id: id,
              status: 1,
              action_by: req.user.id
            };
            arr.push(obj);
          });
          user_type_feature
            .bulkCreate(arr, { transaction: t })
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                data: {
                  user_type: result,
                  feature: res
                }
              });
            })
            .catch(err => {
              console.log('Error function insertUserTypeFeature');
              callback({
                code: 'ERR_DATABASE',
                message: 'Error function insertUserTypeFeature',
                data: err
              });
            });
        }
      ],
      (err, result) => {
        if (err) {
          t.rollback();
          return callback(err);
        }
        t.commit();
        callback(null, result);
      }
    );
  });
};

exports.updateUserType = function(APP, req, callback) {
  let { user_type } = APP.models.mysql;
  user_type
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
        data: err
      });
    });
};

exports.updateUserTypeFeature = function(APP, req, callback) {
  let { user_type_feature } = APP.models.mysql;

  let subfeature = req.body.subfeature.split(','),
    insert = [],
    update = [];

  subfeature.map((x, index) => {
    user_type_feature
      .findOne({
        where: {
          user_type_id: req.body.type,
          subfeature_id: x
        }
      })
      .then(res => {
        if (res == null) {
          insert.push({
            subfeature_id: x,
            user_type_id: req.body.type
          });

          user_type_feature.bulkCreate(insert).then(() => {
            console.log(`id ${x} inserted`);
          });
        } else {
          res
            .update({
              status: res.status == 0 ? 1 : 0
            })
            .then(updated => {
              console.log(`id ${x} updated`);
              update.push(updated);
            });
        }
      });
    if (subfeature.length == index + 1) {
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        data: {
          inserted: insert,
          updated: update
        }
      });
    }
  });
};

exports.connectFeature = (APP, req, callback) => {};

exports.delete = function(APP, req, callback) {
  let { user_type } = APP.models.mysql;
  let params = {
    where: {
      id: req.body.id
    }
  };
  user_type
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
