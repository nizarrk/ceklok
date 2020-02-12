'use strict';

const async = require('async');
const trycatch = require('trycatch');

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

exports.insert = function(APP, req, callback) {
  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function generateCode(callback) {
          let pad = 'G000';
          let kode = '';

          APP.models.company[req.user.db].mysql.grade
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
                let replace = lastID.replace('G', '');
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

        function insertGrading(result, callback) {
          APP.models.company[req.user.db].mysql.grade
            .build({
              code: result,
              name: req.body.name,
              description: req.body.desc
            })
            .save()
            .then(result => {
              let params = 'Insert Success'; //This is only example, Object can also be used
              return callback(null, result.dataValues);
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
        },

        function insertGradeBenefit(result, callback) {
          let benefit = req.body.benefit.split(',');
          let arr = [];

          benefit.map(id => {
            let obj = {
              grade_id: result.id,
              benefit_id: id,
              status: 1
            };
            arr.push(obj);
          });
          APP.models.company[req.user.db].mysql.grade_benefit
            .bulkCreate(arr)
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                data: res
              });
            })
            .catch(err => {
              console.log('Error function insertGradeBenefit');
              callback({
                code: 'ERR_DATABASE',
                message: 'Error function insertGradeBenefit',
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

exports.update = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.grade
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
        data: JSON.stringify(err)
      });
    });
};

exports.updateGradeBenefit = function(APP, req, callback) {
  let mysql = APP.models.company[req.user.db].mysql;

  let benefit = req.body.benefit.split(','),
    insert = [],
    update = [];

  benefit.map((x, index) => {
    mysql.grade_benefit
      .findOne({
        where: {
          grade_id: req.body.grade,
          benefit_id: x
        }
      })
      .then(res => {
        if (res == null) {
          insert.push({
            benefit_id: x,
            grade_id: req.body.grade
          });

          mysql.grade_benefit.bulkCreate(insert).then(() => {
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
    if (benefit.length == index + 1) {
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
