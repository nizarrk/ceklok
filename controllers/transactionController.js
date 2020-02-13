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

exports.insert = function(APP, req, callback) {
  APP.models.mysql.example
    .build({
      name: req.body.name
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
        data: err
      });
    });
};

exports.update = function(APP, req, callback) {
  APP.models.mysql.example
    .update(
      {
        name: req.body.name
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

exports.delete = function(APP, req, callback) {
  let params = {
    where: {
      id: req.body.id
    }
  };
  APP.models.mysql.example
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
