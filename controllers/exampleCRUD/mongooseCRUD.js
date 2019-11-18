'use strict';

/**
 * The model name `example` based on the related file in `/models/mongo` directory.
 *
 * There're many ways to get data from Mongo with `Mongoose`,
 * please check `Mongoose` documentation.
 */
exports.find = function(APP, req, callback) {
  APP.models.mongo.example
    .find({
      name: req.body.name
    })
    .limit(10)
    .skip(0)
    .sort({
      _id: -1
    })
    .lean()
    .exec((err, rows) => {
      if (err)
        return callback({
          code: 'ERR_DATABASE',
          data: JSON.stringify(err)
        });

      callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    });

  return;
};

/**
 * The model name `example` based on the related file in `/models/mongo` directory.
 *
 * There're many ways to insert data to Mongo with `Mongoose`,
 * please check `Mongoose` documentation.
 */
exports.insert = function(APP, req, callback) {
  APP.models.mongo.example.create(
    {
      name: req.body.name
    },
    (err, result) => {
      if (err)
        return callback({
          code: 'ERR_DATABASE',
          data: JSON.stringify(err)
        });

      return callback(null, {
        code: 'INSERT_SUCCESS',
        data: result
      });
    }
  );
};

/**
 * The model name `example` based on the related file in `/models/mongo` directory.
 *
 * There're many ways to delete data from Mongo with `Mongoose`,
 * please check `Mongoose` documentation.
 */
exports.delete = function(APP, req, callback) {
  APP.models.mongo.example.remove(
    {
      name: req.body.name
    },
    (err, result) => {
      if (err)
        return callback({
          code: 'ERR_DATABASE',
          data: JSON.stringify(err)
        });

      return callback(null, {
        code: 'DELETE_SUCCESS',
        data: result
      });
    }
  );
};
