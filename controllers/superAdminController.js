'use strict';

const async = require('async');
const trycatch = require('trycatch');

exports.verifyCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function updatePaymentStatus(callback) {
        APP.models.mysql.payment
          .findOne({
            id: req.body.id
          })
          .then(res => {
            res
              .update({
                status: 'Verified'
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

      function updateCompany(result, callback) {
        let tgl = new Date().getDate().toString();
        let month = new Date().getMonth().toString();
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;

        APP.models.mysql.company
          .findOne({
            id: result.id_company
          })
          .then(res => {
            let array = res.dataValues.nama_company.split(' ');
            let code = '';

            array.map((res, index, arr) => {
              code += res[0].toUpperCase();
            });

            let companyCode = code + time;

            res
              .update({
                code_company: companyCode,
                payment_status: 'Paid'
              })
              .then(result => {
                callback(null, {
                  code: 'UPDATE_SUCCESS',
                  data: result.dataValues
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
