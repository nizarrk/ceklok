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
    foreignKey: 'feature_id'
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

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function generateCode(callback) {
          let pad = 'PRC000';
          let kode = '';

          pricing
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
                let replace = lastID.replace('PRC', '');
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

        function uploadPath(result, callback) {
          if (!req.files || Object.keys(req.files).length === 0) {
            return callback({
              code: 'ERR',
              id: 'PVS01',
              message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
            });
          }

          let fileName = new Date().toISOString().replace(/:|\./g, '');
          let imagePath = './public/uploads/pricing/';

          callback(null, {
            kode: result,
            path: imagePath + fileName + path.extname(req.files.image.name)
          });
        },

        function insertPricing(result, callback) {
          pricing
            .build(
              {
                code: result.kode,
                name: req.body.name,
                description: req.body.desc,
                annual_price: req.body.annual,
                monthly_price: req.body.monthly,
                annual_minimum: req.body.annualmin,
                monthly_minimum: req.body.monthlymin,
                type: req.body.type,
                image: result.path.slice(8),
                action_by: req.user.id
              },
              { transaction: t }
            )
            .save()
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
  let { pricing } = APP.models.mysql;
  async.waterfall(
    [
      function getCurrentValues(callback) {
        pricing
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Pricing tidak ditemukan'
              });
            }
            callback(null, res.dataValues);
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

          callback(null, {
            path: imagePath + fileName + path.extname(req.files.image.name)
          });
        } catch (err) {
          callback(null, {
            old: result.image
          });
        }
      },

      function updatePricing(data, callback) {
        pricing
          .update(
            {
              name: req.body.name,
              description: req.body.desc,
              annual_price: req.body.annual,
              monthly_price: req.body.monthly,
              annual_minimum: req.body.annualmin,
              monthly_minimum: req.body.monthlymin,
              image: data.path ? data.path.slice(8) : data.old,
              type: req.body.type,
              updated_at: new Date(),
              action_by: req.user.id
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
            // Use the mv() method to place the file somewhere on your server
            if (req.files.image) {
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.updatePricingFeature = function(APP, req, callback) {
  let { pricing_feature } = APP.models.mysql;

  let feature = req.body.feature.split(','),
    insert = [],
    update = [];

  feature.map((x, index) => {
    pricing_feature
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

          pricing_feature.bulkCreate(insert).then(() => {
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
    if (feature.length == index + 1) {
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
