'use strict';

const async = require('async');

exports.getSpecificCompany = (APP, req, callback) => {
  let { admin, company } = APP.models.mysql;
  let { _logs } = APP.models.mongo;
  async.waterfall(
    [
      function getCompanyInfo(callback) {
        company.hasMany(admin, {
          sourceKey: 'id',
          foreignKey: 'company_id'
        });
        company
          .findOne({
            include: [
              {
                model: admin,
                attributes: ['id', 'name', 'user_name', 'address']
              }
            ],
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            callback(null, res.dataValues);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },
      function getLogsActivity(data, callback) {
        _logs
          .find({
            company: data.company_code
          })
          .sort('-date')
          .limit(5)
          .then(res => {
            callback(null, {
              code: 'FOUND',
              data: {
                company: data,
                logs: res
              }
            });
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

exports.getSpecificEmployee = (APP, req, callback) => {
  let { company } = APP.models.mysql;
  let { employee } = APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql;
  let { _logs } = APP.models.mongo;
  async.waterfall(
    [
      function checkBody(callback) {
        if (req.body.company && req.body.name) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function getCompanyInfo(data, callback) {
        employee.belongsTo(company, {
          targetKey: 'company_code',
          foreignKey: 'company_code'
        });
        employee
          .findOne({
            include: [
              {
                model: company,
                attributes: ['id', 'name', 'company_code']
              }
            ],
            where: {
              name: {
                $like: '%' + req.body.name + '%'
              }
            }
          })
          .then(res => {
            callback(null, res.dataValues);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },
      function getLogsActivity(data, callback) {
        _logs
          .find({
            company: data.company_code
          })
          .sort('-date')
          .limit(5)
          .then(res => {
            callback(null, {
              code: 'FOUND',
              data: {
                company: data,
                logs: res
              }
            });
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

exports.getCompanyActivityLog = (APP, req, callback) => {
  let { _logs } = APP.models.mongo;
  let startDate = ` ${req.body.datestart} 00:00:00.000Z`;
  let endDate = ` ${req.body.dateend} 23:59:59.999Z`;
  _logs
    .find({
      company: req.body.company,
      date: { $gte: startDate, $lt: endDate }
    })
    .then(res => {
      callback(null, {
        code: 'FOUND',
        data: res
      });
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getEmployeeActivityLog = (APP, req, callback) => {
  let { _logs } = APP.models.mongo;
  let startDate = ` ${req.body.datestart} 00:00:00.000Z`;
  let endDate = ` ${req.body.dateend} 23:59:59.999Z`;
  _logs
    .find({
      company: req.body.company,
      level: 3,
      user_id: req.body.id,
      date: { $gte: startDate, $lt: endDate }
    })
    .then(res => {
      if (res == null) {
        callback({
          code: 'NOT_FOUND'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          data: res
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
};
