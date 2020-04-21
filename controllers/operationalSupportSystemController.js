'use strict';

const async = require('async');
const path = require('path');

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

exports.redeactivateCompany = (APP, req, callback) => {
  let { admin, company } = APP.models.mysql;
  let { token } = APP.models.mongo;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkCompany(callback) {
          company
            .findOne(
              {
                where: {
                  id: req.body.id
                }
              },
              { transaction: t }
            )
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Company tidak ditemukan!'
                });
              } else {
                callback(null, res);
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

        function uploadPath(data, callback) {
          try {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                id: '?',
                message: 'Kesalahan pada parameter upload'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let doc = `./public/uploads/company_${data.company_code}/status/`;

            callback(null, {
              upload: doc + fileName + path.extname(req.files.upload.name),
              status: data.status,
              company_code: data.company_code
            });
          } catch (err) {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          }
        },

        function updateCompanyStatus(data, callback) {
          company
            .update(
              {
                status: data.status == 1 ? 2 : 1,
                status_upload: data.upload.slice(8) // slice 8 buat hilangin ./public
              },
              {
                where: {
                  id: req.body.id
                },
                transaction: t
              }
            )
            .then(updated => {
              callback(null, {
                status: data.status,
                company_code: data.company_code,
                updated: updated,
                upload: data.upload
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function redeactivateAdmin(data, callback) {
          admin
            .update(
              {
                status: data.status == 1 ? 2 : 1
              },
              {
                where: {
                  company_id: req.body.id
                },
                transaction: t
              }
            )
            .then(updated => {
              callback(null, {
                status: data.status,
                company_code: data.company_code,
                company: data.updated,
                admin: updated,
                upload: data.upload
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function destroyAllSessionCompany(data, callback) {
          token
            .remove({
              company_code: data.company_code
            })
            .then(deleted => {
              //upload file
              if (req.files.upload) {
                req.files.upload.mv(data.upload, function(err) {
                  if (err)
                    return callback({
                      code: 'ERR'
                    });
                });
              }
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'Re/deactivate company Berhasil!',
                data: {
                  company: data.company,
                  admin: data.admin,
                  token: deleted
                }
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
