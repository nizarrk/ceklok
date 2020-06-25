'use strict';
const async = require('async');
const presence = require('./presenceController');

exports.generateDailyAbsence = (APP, rule, callback) => {
  async.waterfall(
    [
      function checkCompany(callback) {
        APP.db.sequelize
          .query('SELECT company_code FROM ceklok.company WHERE status = 1')
          .then(res => {
            if (res[0].length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Tidak ada Company Aktif!'
              });
            } else {
              callback(null, res[0]);
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

      function checkDBAvaibility(data, callback) {
        let arr = [];

        Promise.all(
          data.map((x, i) => {
            return APP.db.sequelize
              .query(`SHOW DATABASES LIKE '${process.env.MYSQL_NAME}_${x.company_code}'`)
              .then(res => {
                if (res[0].length !== 0) arr.push(res[0][0][`Database (${process.env.MYSQL_NAME}_${x.company_code})`]);

                return;
              });
          })
        )
          .then(() => {
            callback(null, {
              original: data,
              company: arr
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function filterData(data, callback) {
        let arr = [];

        Promise.all(
          data.original.map((x, i) => {
            return data.company.filter(y => {
              let replaced = y.replace(`${process.env.MYSQL_NAME}_`, ''); // replace 'ceklok_'

              if (replaced == x.company_code) {
                arr.push(x.company_code);
              }
            });
          })
        ).then(() => {
          callback(null, {
            total_company: arr.length,
            company: arr
          });
        });
      },

      function getCompanySetting(data, callback) {
        let arr = [];
        Promise.all(
          data.company.map((x, i) => {
            // let arr = rule.minute;
            console.log(`Looping ke: ${i + 1}`);
            console.log(`Company: ${x}`);

            return APP.db.sequelize
              .query(
                `
                  SELECT 
                    value 
                  FROM 
                    ${process.env.MYSQL_NAME}_${x}.presence_setting 
                  WHERE
                    presence_setting_id = 2
                  `
              )
              .then(res => {
                let result = rule.hour.filter(x => x == res[0][0].value);
                let obj = {};
                obj.company_code = x;
                obj.filtered = result;

                return obj;
              })
              .catch(err => {
                console.log('Query Get Value Failed!', err);
              });
          })
        )
          .then(arr => {
            console.log(arr);
            callback(null, arr);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function generateDaily(data, callback) {
        Promise.all(
          data.map(x => {
            if (x.filtered.length > 0 && new Date().getHours() === x.filtered[0]) {
              console.log(x);
              console.log(`Company: ${x.company_code}`);

              return presence.generateDailyPresence(
                APP,
                {
                  body: {
                    company: x.company_code
                  }
                },
                callback
              );
            }
          })
        )
          .then(() => {
            console.log('CRON Successfully Executed!');
            //   callback(null, {
            //     code: 'OK'
            //   })
          })
          .catch(err => {
            console.log('CRON Failed!', err);
            callback({
              code: 'ERR',
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
