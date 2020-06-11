'use strict';

const async = require('async');

exports.get = function(APP, req, callback) {
  let query;

  async.waterfall(
    [
      function checkLevel(callback) {
        if (req.user.level == 2) {
          query = APP.models.company[req.user.db].mysql.user_type;
          callback(null, true);
        } else {
          query = APP.models.mysql.user_type;
          callback(null, true);
        }
      },

      function getData(data, callback) {
        query
          .findAll()
          .then(rows => {
            if (rows.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Data tidak ditemukan!'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                message: 'Data ditemukan!',
                data: rows
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.getById = function(APP, req, callback) {
  let user_type;
  let user_type_feature;
  let feature = APP.models.mysql.feature;
  let subfeature = APP.models.mysql.subfeature;

  async.waterfall(
    [
      function checkLevel(callback) {
        if (req.user.level == 2) {
          user_type = APP.models.company[req.user.db].mysql.user_type;
          user_type_feature = APP.models.company[req.user.db].mysql.user_type_feature;

          callback(null, true);
        } else {
          user_type = APP.models.mysql.user_type;
          user_type_feature = APP.models.mysql.user_type_feature;

          callback(null, true);
        }
      },

      function getData(data, callback) {
        user_type.hasMany(user_type_feature, {
          sourceKey: 'id',
          foreignKey: 'user_type_id'
        });

        user_type_feature.belongsTo(subfeature, {
          targetKey: 'id',
          foreignKey: 'subfeature_id'
        });

        subfeature.belongsTo(feature, {
          targetKey: 'id',
          foreignKey: 'feature_id'
        });

        user_type
          .findOne({
            include: [
              {
                model: user_type_feature,
                attributes: ['id', 'user_type_id', 'subfeature_id'],
                required: false,
                where: {
                  status: 1
                },
                include: [
                  {
                    model: subfeature,
                    attributes: ['id', 'name', 'description'],
                    include: [
                      {
                        model: feature,
                        attributes: ['id', 'name', 'description']
                      }
                    ]
                  }
                ]
              }
            ],
            where: {
              id: req.body.id
            }
          })
          .then(rows => {
            if (rows == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Data tidak ditemukan!'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                message: 'Data ditemukan!',
                data: rows
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.createUserType = function(APP, req, callback) {
  let { user_type, user_type_feature } =
    req.user.level === 1
      ? APP.models.mysql
      : req.user.level === 2
      ? APP.models.company[req.user.db].mysql
      : callback({
          code: 'INVALID_REQUEST',
          message: 'User Level Undefined'
        });

  let { name, desc, subfeature_id } = req.body;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkParams(callback) {
          if (name && desc && subfeature_id) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'AKQ96',
              message: 'Kesalahan pada parameter'
            });
          }
        },

        function generateCode(result, callback) {
          let kode = APP.generateCode(user_type, 'PRV');
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

        function insertUserType(result, callback) {
          user_type
            .build(
              {
                code: result,
                name: name,
                description: desc
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
          let subfeature = subfeature_id.split(',');
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
            .bulkCreate(arr)
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
  let query;
  let user_type_feature;
  let { name, desc, id, subfeature, status } = req.body;

  async.waterfall(
    [
      function checkParam(callback) {
        if (id) {
          if (req.user.level === 2) {
            query = APP.models.company[req.user.db].mysql.user_type;
            user_type_feature = APP.models.company[req.user.db].mysql.user_type_feature;

            callback(null, true);
          } else if (req.user.level === 1) {
            query = APP.models.mysql.user_type;
            user_type_feature = APP.models.mysql.user_type_feature;

            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Invalid user level!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });
        }
      },

      function checkBody(data, callback) {
        if (name && desc && id && status) {
          if (status == '1' || status == '0') {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter status!'
            });
          }
        } else {
          console.log('3');

          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function updateUserType(data, callback) {
        query
          .update(
            {
              name: name,
              description: desc,
              status: status,
              updated_at: new Date(),
              action_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(result => {
            console.log(result);

            // if (!result || (result && !result[0])) {
            //   return callback({
            //     code: 'INVALID_REQUEST',
            //     message: 'Grade tidak ditemukan!'
            //   });
            // }

            return callback(null, true);
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
      },

      function updateUserTypeFeature(data, callback) {
        if (subfeature === null) {
          callback(null, {
            code: 'UPDATE_SUCCESS',
            message: 'User type berhasil diubah!'
          });
        } else {
          let subfeatures = subfeature.split(','),
            insert = [],
            update = [];

          Promise.all(
            subfeatures.map((x, index) => {
              return user_type_feature
                .findOne({
                  where: {
                    user_type_id: id,
                    subfeature_id: x
                  }
                })
                .then(res => {
                  if (res == null) {
                    insert.push({
                      subfeature_id: x,
                      user_type_id: id
                    });

                    return user_type_feature
                      .create({
                        subfeature_id: x,
                        user_type_id: id
                      })
                      .then(() => {
                        console.log(`id ${x} inserted`);
                        return true;
                      });
                  }
                  return res
                    .update({
                      status: res.status == 0 ? 1 : 0
                    })
                    .then(updated => {
                      console.log(`id ${x} updated`);
                      update.push(updated);
                      return true;
                    });
                });
            })
          )
            .then(() => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'User type berhasil diubah!',
                data: {
                  inserted: insert,
                  updated: update
                }
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR',
                data: err
              });
            });
        }
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    }
  );
  // let { user_type } = APP.models.mysql;
  // user_type
  //   .update(
  //     {
  //       name: req.body.name,
  //       description: req.body.desc
  //     },
  //     {
  //       where: {
  //         id: req.body.id
  //       }
  //     }
  //   )
  //   .then(result => {
  //     if (!result || (result && !result[0])) {
  //       let params = 'No data updated'; //This is only example, Object can also be used
  //       return callback(null, {
  //         code: 'UPDATE_NONE',
  //         data: params
  //       });
  //     }

  //     let params = 'Update Success'; //This is only example, Object can also be used
  //     return callback(null, {
  //       code: 'UPDATE_SUCCESS',
  //       data: params
  //     });
  //   })
  //   .catch(err => {
  //     console.log('iki error', err);

  //     if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
  //       let params = 'Error! Empty Query'; //This is only example, Object can also be used
  //       return callback({
  //         code: 'UPDATE_NONE',
  //         data: params
  //       });
  //     }

  //     if (err.original && err.original.code === 'ER_DUP_ENTRY') {
  //       let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
  //       return callback({
  //         code: 'DUPLICATE',
  //         data: params
  //       });
  //     }

  //     return callback({
  //       code: 'ERR_DATABASE',
  //       data: err
  //     });
  //   });
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

exports.delete = function(APP, req, callback) {
  let query;
  let user_type;
  let user_type_feature;
  async.waterfall(
    [
      function checkParam(callback) {
        if (req.body.id) {
          if (req.user.level === 2) {
            query = APP.models.mysql.admin;
            user_type = APP.models.company[req.user.db].mysql.user_type;
            user_type_feature = APP.models.company[req.user.db].mysql.user_type_feature;

            callback(null, true);
          } else if (req.user.level === 1) {
            query = APP.models.mysql.admin_app;
            user_type = APP.models.mysql.user_type;
            user_type_feature = APP.models.mysql.user_type_feature;

            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Invalid user level!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });
        }
      },

      function checkUser(data, callback) {
        query
          .findAll({
            where: {
              user_type_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan grading ini!'
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: '?',
              data: err
            });
          });
      },

      function deleteUserType(data, callback) {
        user_type
          .destroy({
            where: {
              id: req.body.id
            }
          })
          .then(deleted => {
            if (!deleted)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Grade tidak ditemukan!'
              });

            callback(null, deleted);
          })
          .catch(err => {
            return callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function deleteGradeBenefit(data, callback) {
        user_type_feature
          .destroy({
            where: {
              user_type_id: req.body.id
            }
          })
          .then(deleted => {
            callback(null, {
              code: 'DELETE_SUCCESS',
              id: '?',
              message: '',
              data: {
                user_type: data,
                user_type_feature: deleted
              }
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
