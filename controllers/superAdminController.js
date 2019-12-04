'use strict';

const async = require('async');
const trycatch = require('trycatch');

exports.verifyCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function updatePaymentStatus(callback) {
        APP.models.mysql.payment
          .findOne({
            where: { id: req.body.id }
          })
          .then(res => {
            res
              .update({
                status: 1
              })
              .then(result => {
                callback(null, result.dataValues);
              })
              .catch(err => {
                callback({
                  code: 'ERR_DATABASE',
                  data: JSON.stringify(err)
                });
              });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function generateCompanyCode(result, callback) {
        let tgl = new Date().getDate().toString();
        if (tgl.length == 1) {
          tgl = '0' + new Date().getDate().toString();
        }
        let month = new Date().getMonth().toString();
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;

        APP.models.mysql.company
          .findOne({
            where: {
              id: result.company_id
            }
          })
          .then(res => {
            let array = res.name.split(' ');
            let code = '';

            array.map(res => {
              code += res[0].toUpperCase();
            });

            let companyCode = code + time + '0'; // 0 is numbering index
            APP.models.mysql.company
              .findAll({
                where: {
                  company_code: {
                    $like: `${code + time}%`
                  }
                },
                limit: 1,
                order: [['id', 'DESC']]
              })
              .then(res => {
                if (res.length == 0) {
                  callback(null, {
                    payment: result,
                    companyCode
                  });
                } else {
                  let lastID = res[0].code_company;
                  let replace = lastID.replace(code + time, '');
                  let num = parseInt(replace) + 1;

                  companyCode = code + time + num;

                  callback(null, {
                    payment: result,
                    companyCode
                  });
                }
              })
              .catch(err => console.log(err));
          });
      },

      function updateCompany(data, callback) {
        APP.models.mysql.company
          .findOne({
            where: {
              id: data.payment.company_id
            }
          })
          .then(res => {
            res
              .update({
                company_code: data.companyCode,
                status: 1
              })
              .then(result => {
                callback(null, { payment: data.payment, company: result, code: data.companyCode });
              })
              .catch(err => {
                console.log('1', err);

                callback({
                  code: 'ERR_DATABASE',
                  data: JSON.stringify(err)
                });
              });
          })
          .catch(err => {
            console.log('2', err);

            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function updateAdmin(data, callback) {
        APP.models.mysql.admin
          .findOne({
            where: {
              company_id: data.payment.company_id
            }
          })
          .then(res => {
            res
              .update({
                company_code: data.code
              })
              .then(result => {
                callback(null, {
                  code: 'UPDATE_SUCCESS',
                  data: {
                    payment: data.payment,
                    company: data.company,
                    admin: result
                  }
                });
              })
              .catch(err => {
                console.log('1', err);

                callback({
                  code: 'ERR_DATABASE',
                  data: JSON.stringify(err)
                });
              });
          })
          .catch(err => {
            console.log('2', err);

            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
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
