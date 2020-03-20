'use strict';

const async = require('async');

exports.listAllTransaction = function(APP, req, callback) {
  let { payment, payment_detail, payment_method, payment_type, transaction_type } = APP.models.mysql;
  let params = {};

  async.waterfall(
    [
      function checkLevel(callback) {
        if (req.user.level === 1) {
          callback(null, params);
        } else if (req.user.level === 2) {
          params = {
            company_id: req.user.company
          };

          callback(null, params);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid User Level'
          });
        }
      },

      function getData(params, callback) {
        // if (req.body.type) {
        //   params.transaction_type_id = req.body.type;
        // }

        if (req.body.status || req.body.status == '0') {
          params.status = req.body.status;
        }

        if (req.body.datestart && req.body.dateend) {
          params.date = {
            $between: [req.body.datestart, req.body.dateend]
          };
        }

        console.log(params);

        // add payment_method to payment
        payment.belongsTo(payment_method, {
          targetKey: 'id',
          foreignKey: 'payment_method_id'
        });

        // add payment_type to payment_method
        payment_method.belongsTo(payment_type, {
          targetKey: 'id',
          foreignKey: 'payment_type_id'
        });

        //add payment_detail to payment
        payment.hasMany(payment_detail, {
          sourceKey: 'id',
          foreignKey: 'payment_id'
        });

        // add transaction_type to payment
        payment_detail.belongsTo(transaction_type, {
          targetKey: 'id',
          foreignKey: 'transaction_type_id'
        });

        payment
          .findAll({
            include: [
              {
                model: payment_method,
                attributes: ['id', 'payment_type_id', 'to_bank_name', 'to_rek_name', 'to_rek_no'],
                include: [
                  {
                    model: payment_type,
                    attributes: ['id', 'name']
                  }
                ]
              },
              {
                model: payment_detail,
                attributes: ['id', 'payment_id', 'transaction_type_id', 'item_id'],
                include: [
                  {
                    model: transaction_type,
                    attributes: ['id', 'name']
                  }
                ]
              }
            ],
            where: params
          })
          .then(rows => {
            if (rows.length == 0) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Data tidak ditemukan'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                id: '?',
                message: 'Data ditemukan',
                data: rows
              });
            }
          })
          .catch(err => {
            console.log(err);

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

exports.transactionDetail = (APP, req, callback) => {
  let { payment, payment_detail, payment_method, payment_type, transaction_type } = APP.models.mysql;
  let params = { id: req.body.id };

  async.waterfall(
    [
      function checkParams(callback) {
        if (req.body.id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Kesalahan pada parameter id'
          });
        }
      },

      function checkLevel(data, callback) {
        if (req.user.level === 1 || req.user.level === 2) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid User Level'
          });
        }
      },

      function getData(data, callback) {
        // add payment_method to payment
        payment.belongsTo(payment_method, {
          targetKey: 'id',
          foreignKey: 'payment_method_id'
        });

        // add payment_type to payment_method
        payment_method.belongsTo(payment_type, {
          targetKey: 'id',
          foreignKey: 'payment_type_id'
        });

        //add payment_detail to payment
        payment.hasMany(payment_detail, {
          sourceKey: 'id',
          foreignKey: 'payment_id'
        });

        // add transaction_type to payment
        payment_detail.belongsTo(transaction_type, {
          targetKey: 'id',
          foreignKey: 'transaction_type_id'
        });

        payment
          .findOne({
            include: [
              {
                model: payment_method,
                attributes: ['id', 'payment_type_id', 'to_bank_name', 'to_rek_name', 'to_rek_no'],
                include: [
                  {
                    model: payment_type,
                    attributes: ['id', 'name']
                  }
                ]
              },
              {
                model: payment_detail,
                attributes: ['id', 'payment_id', 'transaction_type_id', 'item_id'],
                include: [
                  {
                    model: transaction_type,
                    attributes: ['id', 'name']
                  }
                ]
              }
            ],
            where: params
          })
          .then(rows => {
            if (rows == null) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Data tidak ditemukan'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                id: '?',
                message: 'Data ditemukan',
                data: rows
              });
            }
          })
          .catch(err => {
            console.log(err);

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
