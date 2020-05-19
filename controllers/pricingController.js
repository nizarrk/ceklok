'use strict';

const async = require('async');
const fs = require('fs');
const path = require('path');
const trycatch = require('trycatch');

exports.get = function(APP, req, callback) {
  let { pricing, pricing_feature, feature, feature_type } = APP.models.mysql;
  let arr = [];

  pricing.hasMany(pricing_feature, {
    targetKey: 'id',
    foreignKey: 'pricing_id'
  });

  pricing_feature.belongsTo(feature, {
    targetKey: 'id',
    foreignKey: 'feature_id'
  });

  feature.belongsTo(feature_type, {
    targetKey: 'id',
    foreignKey: 'feature_type_id'
  });

  pricing
    .findAll({
      include: [
        {
          model: pricing_feature,
          attributes: ['id', 'feature_id'],
          include: [
            {
              model: feature,
              attributes: ['id', 'name', 'description'],
              include: [
                {
                  model: feature_type,
                  attributes: ['id', 'name', 'description']
                }
              ]
            }
          ]
        }
      ]
    })
    .then(rows => {
      if (rows.length == 0) {
        return callback({
          code: 'NOT_FOUND',
          message: 'List pricing tidak ditemukan'
        });
      }

      callback(null, {
        code: 'FOUND',
        data: rows
      });
    })
    .catch(err => {
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getPricingDetails = function(APP, req, callback) {
  let { pricing, pricing_feature, feature, feature_type } = APP.models.mysql;
  let arr = [];

  pricing_feature.belongsTo(feature, {
    targetKey: 'id',
    foreignKey: 'feature_id'
  });

  feature.belongsTo(feature_type, {
    targetKey: 'id',
    foreignKey: 'feature_type_id'
  });

  pricing
    .findOne({
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows == null) {
        return callback({
          code: 'NOT_FOUND',
          message: 'List pricing tidak ditemukan'
        });
      }
      let obj = {};

      obj.pricing = rows.dataValues;

      pricing_feature
        .findAll({
          include: [
            {
              model: feature,
              attributes: ['id', 'name', 'description'],
              include: [
                {
                  model: feature_type,
                  attributes: ['id', 'name', 'description']
                }
              ]
            }
          ],
          where: {
            pricing_id: req.body.id
          }
        })
        .then(res => {
          res.map(z => {
            obj.feature = z.dataValues;
          });
        });
    })
    .catch(err => {
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.insert = function(APP, req, callback) {
  let { pricing, pricing_feature } = APP.models.mysql;
  let { name, desc, annual, monthly, onetime, annualmin, monthlymin, onetimemin, type } = req.body;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkBody(callback) {
          if (name && desc && annual && monthly && onetime && annualmin && monthlymin && onetimemin && type) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        },

        function generateCode(result, callback) {
          let kode = APP.generateCode(pricing, 'PRC');
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
                id: '?',
                message: 'Terjadi Kesalahan, mohon coba kembali'
              });
            });
        },

        function uploadPath(result, callback) {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback({
              code: 'ERR',
              id: 'PVS01',
              message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
            });
          }

          APP.fileCheck(req.files.image.data, 'image').then(res => {
            if (res == null) {
              callback({
                code: 'INVALID_REQUEST',
                message: 'File yang diunggah tidak sesuai!'
              });
            } else {
              let fileName = new Date().toISOString().replace(/:|\./g, '');
              let imagePath = './public/uploads/pricing/';

              callback(null, {
                kode: result,
                path: imagePath + fileName + path.extname(req.files.image.name)
              });
            }
          });
        },

        function insertPricing(result, callback) {
          pricing
            .create(
              {
                code: result.kode,
                name: name,
                description: desc,
                annual_price: annual,
                monthly_price: monthly,
                one_time_price: onetime,
                annual_minimum: annualmin,
                monthly_minimum: monthlymin,
                one_time_minimum: onetimemin,
                type: type,
                image: result.path.slice(8),
                action_by: req.user.id
              },
              { transaction: t }
            )
            .then(res => {
              callback(null, {
                path: result.path,
                pricing: res.dataValues
              });
            })
            .catch(err => {
              console.log('Error insertPricing', err);

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
                message: 'Error insertPricing',
                data: err
              });
            });
        },

        function insertPricingFeature(result, callback) {
          let feature = req.body.feature.split(',');
          let arr = [];

          feature.map(id => {
            let obj = {
              pricing_id: result.pricing.id,
              feature_id: id,
              status: 1,
              action_by: req.user.id
            };
            arr.push(obj);
          });
          pricing_feature
            .bulkCreate(arr, { transaction: t })
            .then(res => {
              // Use the mv() method to place the file somewhere on your server
              req.files.image.mv(result.path, function(err) {
                if (err) {
                  console.log(err);

                  return callback({
                    code: 'ERR',
                    id: 'PVS01',
                    message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                  });
                }
              });
              callback(null, {
                code: 'INSERT_SUCCESS',
                data: {
                  pricing: result.pricing,
                  feature: res
                }
              });
            })
            .catch(err => {
              console.log('Error function insertPricingFeature');
              callback({
                code: 'ERR_DATABASE',
                message: 'Error function insertPricingFeature',
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
  let { pricing, pricing_feature } = APP.models.mysql;
  let { id, name, desc, annual, monthly, onetime, annualmin, monthlymin, onetimemin, type, feature } = req.body;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkBody(callback) {
          if (id && name && desc && annual && monthly && onetime && annualmin && monthlymin && onetimemin && type) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        },

        function getCurrentValues(result, callback) {
          pricing
            .findOne({
              where: {
                id: id
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Pricing tidak ditemukan'
                });
              } else {
                callback(null, res.dataValues);
              }
            })
            .catch(err => {
              console.log('Error getCurrentValues', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error getCurrentValues',
                data: err
              });
            });
        },

        function uploadPath(result, callback) {
          try {
            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let imagePath = './public/uploads/pricing/';
            // let path = imagePath + fileName + path.extname(req.files.image.name)

            APP.fileCheck(req.files.image.data, 'image').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                callback(null, {
                  path: imagePath + fileName + path.extname(req.files.image.name),
                  upload: true
                });
              }
            });
          } catch (err) {
            callback(null, {
              old: result.image,
              upload: false
            });
          }
        },

        function updatePricing(data, callback) {
          pricing
            .update(
              {
                name: name,
                description: desc,
                annual_price: annual,
                monthly_price: monthly,
                one_time_price: onetime,
                annual_minimum: annualmin,
                monthly_minimum: monthlymin,
                one_time_minimum: onetimemin,
                image: data.upload ? data.path.slice(8) : data.old,
                type: type,
                updated_at: new Date(),
                action_by: req.user.id
              },
              {
                where: {
                  id: id
                },
                transaction: t
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

              data.result = result;
              return callback(null, data);
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

        function updatePricingFeature(data, callback) {
          if (feature === null) {
            // Use the mv() method to place the file somewhere on your server
            if (data.upload) {
              req.files.image.mv(data.path, function(err) {
                if (err) {
                  console.log(err);

                  return callback({
                    code: 'ERR',
                    id: 'PVS01',
                    message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                  });
                }
              });
            }

            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: data.result
            });
          } else {
            let features = feature.split(',');
            let insert = [];
            let update = [];

            Promise.all(
              features.map((x, index) => {
                return pricing_feature
                  .findOne({
                    where: {
                      pricing_id: id,
                      feature_id: x
                    }
                  })
                  .then(res => {
                    if (res == null) {
                      insert.push({
                        feature_id: x,
                        pricing_id: id
                      });

                      return pricing_feature.bulkCreate(insert).then(() => {
                        console.log(`id ${x} inserted`);
                      });
                    } else {
                      return res
                        .update({
                          status: res.status == 0 ? 1 : 0
                        })
                        .then(updated => {
                          console.log(`id ${x} updated`);
                          update.push(updated);
                        });
                    }
                  });
              })
            ).then(() => {
              // Use the mv() method to place the file somewhere on your server
              if (data.upload) {
                req.files.image.mv(data.path, function(err) {
                  if (err) {
                    console.log(err);

                    return callback({
                      code: 'ERR',
                      id: 'PVS01',
                      message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                    });
                  }
                });
              }

              callback(null, {
                code: 'UPDATE_SUCCESS',
                data: {
                  result: data.result,
                  inserted: insert,
                  updated: update
                }
              });
            });
          }
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

exports.updatePricingFeature = function(APP, req, callback) {
  let { pricing_feature } = APP.models.mysql;

  let features = req.body.feature.split(',');
  let insert = [];
  let update = [];

  Promise.all(
    features.map((x, index) => {
      return pricing_feature
        .findOne({
          where: {
            pricing_id: req.body.pricing,
            feature_id: x
          }
        })
        .then(res => {
          if (res == null) {
            insert.push({
              feature_id: x,
              pricing_id: req.body.pricing
            });

            return pricing_feature.bulkCreate(insert).then(() => {
              console.log(`id ${x} inserted`);
            });
          } else {
            return res
              .update({
                status: res.status == 0 ? 1 : 0
              })
              .then(updated => {
                console.log(`id ${x} updated`);
                update.push(updated);
              });
          }
        });
    })
  ).then(() => {
    callback(null, {
      code: 'UPDATE_SUCCESS',
      data: {
        inserted: insert,
        updated: update
      }
    });
  });
};

exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.mysql.pricing
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
