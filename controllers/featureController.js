'use strict';

const async = require('async');
const path = require('path');
const fs = require('fs');

exports.displayAllFeature = function(APP, req, callback) {
  let { feature, subfeature, feature_type } = APP.models.mysql;

  feature.hasMany(subfeature, {
    sourceKey: 'id',
    foreignKey: 'feature_id'
  });

  feature.belongsTo(feature_type, {
    targetKey: 'id',
    foreignKey: 'feature_type_id'
  });

  feature
    .findAll({
      include: [
        {
          model: feature_type,
          attributes: ['id', 'name', 'description']
        },
        {
          model: subfeature,
          attributes: ['id', 'name', 'description']
        }
      ]
    })
    .then(rows => {
      if (rows.length == 0) {
        return callback({
          code: 'NOT_FOUND',
          message: 'List feature tidak ditemukan'
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

exports.displayFeatureCompany = function(APP, req, callback) {
  let { feature, subfeature, feature_type } = APP.models.mysql;

  async.waterfall(
    [
      function getAllFeatures(callback) {
        feature.hasMany(subfeature, {
          sourceKey: 'id',
          foreignKey: 'feature_id'
        });

        feature.belongsTo(feature_type, {
          targetKey: 'id',
          foreignKey: 'feature_type_id'
        });

        feature
          .findAll({
            include: [
              {
                model: feature_type,
                attributes: ['id', 'name', 'description']
              },
              {
                model: subfeature,
                attributes: ['id', 'name', 'description']
              }
            ]
          })
          .then(rows => {
            if (rows.length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'List feature tidak ditemukan'
              });
            }

            callback(null, rows);
          })
          .catch(err => {
            console.log('Error getAllFeatures', err);

            return callback({
              code: 'ERR_DATABASE',
              message: 'Error getAllFeatures',
              data: err
            });
          });
      },

      function getActiveFeatures(result, callback) {
        APP.db.sequelize
          .query(
            `SELECT 
                        a.id, a.feature_id, b.name AS feature_name, 
                        b.description AS feature_description, 
                        c.name AS subfeature_name, c.description AS subfeature_description, 
                        d.name AS type_name, d.description AS type_description
                    FROM 
                        ceklok_VST1912231.feature_active as a
                    JOIN 
                        ceklok.feature AS b 
                    ON 
                        b.id = a.feature_id 
                    JOIN 
                        ceklok.subfeature AS c 
                    ON 
                        b.id = c.feature_id
                    JOIN 
                        ceklok.feature_type as d
                    ON
                        b.feature_type_id = d.id`
          )
          .then(rows => {
            if (rows[0].length == 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'List feature tidak ditemukan'
              });
            }

            callback(null, {
              code: 'FOUND',
              data: {
                all: result,
                active: rows[0]
              }
            });
          })
          .catch(err => {
            console.log('Error getActiveFeatures', err);

            return callback({
              code: 'ERR_DATABASE',
              message: 'Error getActiveFeatures',
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

exports.addNewFeature = (APP, req, callback) => {
  let { feature } = APP.models.mysql;

  feature
    .build({
      feature_type_id: req.body.type,
      name: req.body.name,
      description: req.body.desc,
      action_by: req.user.id
    })
    .save()
    .then(res => {
      callback(null, {
        code: 'INSERT_SUCCESS',
        data: res
      });
    })
    .catch(err => {
      console.log(err);
      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        return callback({
          code: 'DUPLICATE',
          message: err.original.sqlMessage
        });
      }

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.addSubFeature = (APP, req, callback) => {
  let { feature, subfeature } = APP.models.mysql;
  async.waterfall(
    [
      function checkAvailableFeature(callback) {
        feature
          .findOne({
            where: {
              id: req.body.subfeature[0].feature
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Feature tidak ditemukan'
              });
            }
            callback(null, true);
          });
      },

      function insertSubFeature(result, callback) {
        let subfeatures = [];

        req.body.subfeature.map((x, index) => {
          let obj = {};

          obj.feature_id = req.body.subfeature[index].feature;
          obj.name = req.body.subfeature[index].name;
          obj.description = req.body.subfeature[index].desc;
          obj.action_by = req.user.id;

          subfeatures.push(obj);
        });

        subfeature
          .bulkCreate(subfeatures)
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log('Error addSubFeature', err);

            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              return callback({
                code: 'DUPLICATE',
                message: err.original.sqlMessage
              });
            }

            callback({
              code: 'ERR_DATABASE',
              message: 'Error addSubFeature',
              data: err.original
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

exports.addEndpoint = (APP, req, callback) => {
  let { url, method, directory, controller, fungsi, subfeature_id, auth, body } = req.body.endpoint;
  let { endpoint, feature, subfeature } = APP.models.mysql;

  async.waterfall(
    [
      function checkEndpoint(callback) {
        endpoint
          .findAndCountAll({ where: { endpoint: url, status: 1 } })
          .then(res => {
            if (res.count > 0) {
              callback(null, {
                code: 'INVALID_REQUEST',
                no: 'CMQ96',
                message: 'endpoint invalid',
                data: {}
              });
            } else {
              callback(null, true);
            }
          })
          .catch(err => {
            console.log('Error checkEndpoint', err);

            callback({
              code: 'ERR_DATABASE',
              no: 'CMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( endpoint )',
              data: err
            });
          });
      },
      function checkMethod(data, callback) {
        if (
          method.toLowerCase() === 'post' ||
          method.toLowerCase() === 'get' ||
          method.toLowerCase() === 'put' ||
          method.toLowerCase() === 'patch' ||
          method.toLowerCase() === 'delete'
        ) {
          callback(null, true);
        } else {
          callback(null, {
            code: 'INVALID_REQUEST',
            no: 'CMQ96',
            message: 'method invalid',
            data: {}
          });
        }
      },
      function checkDirectory(data, callback) {
        try {
          fs.readdir(path.join(__dirname, '../controllers'), (err, file) => {
            if (file.length > 0) {
              callback(null, file);
            } else {
              callback(null, {
                code: 'INVALID',
                no: 'CMQ96',
                message: 'directory tidak ditemukan',
                data: {}
              });
            }
          });
        } catch (err) {
          console.log('Error checkDirectory', err);

          callback(null, {
            code: 'INVALID_REQUEST',
            no: 'CMQ96',
            message: 'directory tidak di temukan',
            data: {}
          });
        }
      },
      function cekController(data, callback) {
        data.filter(x => x === controller.replace('.js', ''));
        if (data.length > 0) {
          callback(null, true);
        } else {
          callback(null, {
            code: 'INVALID',
            no: 'CMQ96',
            message: 'controller tidak di temukan',
            data: {}
          });
        }
      },
      function checkSubfeature(data, callback) {
        subfeature.belongsTo(feature, { foreignKey: 'feature_id' });

        subfeature
          .findAll({
            attributes: ['name', 'feature_id'],
            where: { id: subfeature_id, status: 1 },
            include: [
              {
                model: feature,
                attributes: ['name'],
                required: true
              }
            ]
          })
          .then(res => {
            if (res.length > 0) {
              let data = {};

              data.subfeature_name = res[0].name;
              data.feature_id = res[0].feature_id;
              data.feature_name = res[0].feature.name;

              callback(null, data);
            } else {
              callback(null, {
                code: 'INVALID',
                no: 'CMQ96',
                message: 'sub feature id invalid',
                data: {}
              });
            }
          })
          .catch(err => {
            console.log('Error checkSubfeature', err);

            callback({
              code: 'ERR_DATABASE',
              no: 'CMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( sub feature )',
              data: err
            });
          });
      },
      // function cekAuthAndBody( data , callback ) {

      //     if ( auth !== '0' || auth !== '1') {
      //         callback( null ,{
      //             code: 'INVALID',
      //             no: 'CMQ96',
      //             message: 'auth invalid',
      //             data: {}
      //         });
      //     }

      //     if ( body !== '0' || body !== '1') {
      //         callback( null ,{
      //             code: 'INVALID',
      //             no: 'CMQ96',
      //             message: 'body invalid',
      //             data: {}
      //         });
      //     }

      //     callback( null , true );
      // },
      function insertEndpoint(data, callback) {
        let endpoints = [];
        req.body.endpoint.map((x, index) => {
          let obj = {};

          (obj.endpoint = url),
            (obj.method = method),
            (obj.directory = directory),
            (obj.controller = controller.replace('.js', '')),
            (obj.function = fungsi),
            (obj.feature_name = data.feature_name),
            (obj.feature_id = data.feature_id),
            (obj.subfeature_id = subfeature_id),
            (obj.activity = data.subfeature_name),
            (obj.auth = auth),
            // body = body,
            (obj.created_by = req.user.id);
        });
        endpoint
          .bulkCreate()
          .then(() => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              no: 'CMP00',
              message: 'Penambahan endpoint berhasil',
              data: {}
            });
          })
          .catch(err => {
            console.log('Error insert', err);

            callback({
              code: 'ERR_DATABASE',
              no: 'CMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( sub feature )',
              data: err
            });
          });
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    }
  );
};

exports.addSubFeatureSettings = (APP, req, callback) => {
  let mysql = APP.models.mysql;
  let settings = [];

  req.body.setting.map((x, index) => {
    let obj = {};

    obj.subfeature_id = req.body.setting[index].subfeature;
    obj.name = req.body.setting[index].name;
    obj.description = req.body.setting[index].desc;

    settings.push(obj);
  });

  mysql.subfeature_setting_master
    .bulkCreate(settings)
    .then(res => {
      callback(null, {
        code: 'INSERT_SUCCESS',
        data: res
      });
    })
    .catch(err => {
      console.log('Error addSetting', err);
      callback({
        code: 'ERR_DATABASE',
        message: 'Error addSetting',
        data: err
      });
    });
};

exports.connectNewFeatureCompany = (APP, req, callback) => {
  let { pricing, feature, pricing_feature } = APP.models.mysql;
  let { feature_active } = APP.models.company[req.user.db].mysql;

  async.waterfall([
    function checkFeature(callback) {
      feature
        .findOne({
          where: {
            id: req.body.feature
          }
        })
        .then(res => {
          if (res == null) {
            return callback({
              code: 'NOT_FOUND',
              message: 'Feature tidak ditemukan'
            });
          }

          callback(null, res.dataValues);
        })
        .catch(err => {
          console.log('Error checkFeature', err);
          callback({
            code: 'ERR_DATABASE',
            message: 'Error checkFeature',
            data: err
          });
        });
    },

    function connectFeature(result, callback) {
      pricing_feature
        .findOne({
          where: {
            feature_id: req.body.feature
          }
        })
        .then(res => {
          if (res == null) {
            feature_active
              .create({
                feature_id: req.body.feature,
                date_start: new Date(),
                status: 2 // needs settings
              })
              .then(created => {
                callback(null, {
                  code: 'INSERT_SUCCESS',
                  data: created
                });
              })
              .catch(err => {
                console.log('Error connectFeature', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error connectFeature',
                  data: err
                });
              });
          } else {
            //payment.....
          }
        });
    }
  ]);
};