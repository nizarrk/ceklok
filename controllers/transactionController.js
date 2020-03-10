'use strict';

const async = require('async');

exports.getByCompany = function(APP, req, callback) {
  let mysql = APP.models.mysql;
  let params = {
    company_id: req.user.company
  };

  if (req.body.type) {
    params.transaction_type_id = req.body.type;
  }

  if (req.body.status || req.body.status === 0) {
    params.status = req.body.status;
  }

  if (req.body.datestart && req.body.dateend) {
    params.date = {
      $between: [req.body.datestart, req.body.dateend]
    };
  }

  console.log(params);

  console.log(mysql);

  // add payment_method to payment
  mysql.payment.belongsTo(mysql.payment_method, {
    targetKey: 'id',
    foreignKey: 'payment_method_id'
  });

  // add transaction_type to payment
  mysql.payment.belongsTo(mysql.transaction_type, {
    targetKey: 'id',
    foreignKey: 'transaction_type_id'
  });

  // add payment_type to payment_method
  mysql.payment_method.belongsTo(mysql.payment_type, {
    targetKey: 'id',
    foreignKey: 'payment_type_id'
  });

  mysql.payment
    .findAll({
      include: [
        {
          model: mysql.payment_method,
          attributes: ['id', 'payment_type_id', 'to_bank_name', 'to_rek_name', 'to_rek_no'],
          include: [
            {
              model: mysql.payment_type,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: mysql.transaction_type,
          attributes: ['id', 'name']
        }
      ],
      where: params == {} ? 1 + 1 : params
    })
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
        data: err
      });
    });
};

exports.getAllCompany = function(APP, req, callback) {
  let mysql = APP.models.mysql;
  let params = {};

  if (req.body.company) {
    params.company_id = req.body.company;
  }

  if (req.body.type) {
    params.transcation_type_id = req.body.type;
  }

  if (req.body.status || req.body.status === 0) {
    params.status = req.body.status;
  }

  if (req.body.datestart && req.body.dateend) {
    params.date = {
      $between: [req.body.datestart, req.body.dateend]
    };
  }

  console.log(params);

  // add company to payment
  mysql.payment.belongsTo(mysql.company, {
    targetKey: 'id',
    foreignKey: 'company_id'
  });

  // add pricing to company
  mysql.company.belongsTo(mysql.pricing, {
    targetKey: 'id',
    foreignKey: 'pricing_id'
  });

  // add payment_method to payment
  mysql.payment.belongsTo(mysql.payment_method, {
    targetKey: 'id',
    foreignKey: 'payment_method_id'
  });

  // add transaction_type to payment
  mysql.payment.belongsTo(mysql.transaction_type, {
    targetKey: 'id',
    foreignKey: 'transaction_type_id'
  });

  // add payment_type to payment_method
  mysql.payment_method.belongsTo(mysql.payment_type, {
    targetKey: 'id',
    foreignKey: 'payment_type_id'
  });

  mysql.payment
    .findAll({
      include: [
        {
          model: mysql.company,
          attributes: ['id', 'company_code', 'name', 'tlp', 'address'],
          include: [
            {
              model: mysql.pricing,
              attributes: ['id', 'name', 'description']
            }
          ]
        },
        {
          model: mysql.payment_method,
          attributes: ['id', 'payment_type_id', 'to_bank_name', 'to_rek_name', 'to_rek_no'],
          include: [
            {
              model: mysql.payment_type,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: mysql.transaction_type,
          attributes: ['id', 'name']
        }
      ],
      where: params == {} ? 1 + 1 : params
    })
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
