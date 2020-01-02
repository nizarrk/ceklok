'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const csv = require('csvjson');
const trycatch = require('trycatch');
const mkdirp = require('mkdirp');
const bcrypt = require('bcrypt');

const generateEmployeeCode = async (APP, req, index) => {
  let tgl = new Date().getDate().toString();
  if (tgl.length == 1) {
    tgl = '0' + new Date().getDate().toString();
  }
  let month = (new Date().getMonth() + 1).toString();
  if (month.length == 1) {
    month = '0' + month;
  }
  let year = new Date()
    .getFullYear()
    .toString()
    .slice(2, 4);
  let time = year + month + tgl;
  let pad = '0000';
  let kode = '';
  let add = 1;

  if (index) {
    add = index;
  }

  let res = await APP.models.company[req.user.db].mysql.employee.findAll({
    limit: 1,
    order: [['id', 'DESC']]
  });

  if (res.length == 0) {
    console.log('kosong');
    let str = '' + 1;

    kode = req.user.code + '-' + time + '-' + str;

    return kode;
  } else {
    console.log('ada');
    let lastID = res[0].employee_code;
    let replace = lastID.replace(req.user.code + '-', '');
    let lastNum = replace.charAt(replace.length - 1);

    let num = parseInt(lastNum) + add;

    kode = req.user.code + '-' + time + num;

    return kode;
  }
};

exports.testing = (APP, req, callback) => {
  async.waterfall(
    [
      function generate(callback) {
        let promise = new Promise((resolve, reject) => {
          resolve(generateEmployeeCode(APP, req));
        });

        promise
          .then(res => {
            callback(null, res);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: JSON.stringify(err)
            });
          });
      },
      function tes(result, callback) {
        callback(null, {
          code: 'OK',
          data: result
        });
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }

      return callback(null, result);
    }
  );
};

exports.test = function(APP, req, callback) {
  async.waterfall(
    [
      function uploadDocuments(callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let importPath = `./public/uploads/company_${req.user.code}/employee/import/`;

            if (!fs.existsSync(importPath)) {
              mkdirp.sync(importPath);
            }

            if (req.files.import) {
              req.files.import.mv(importPath + fileName + path.extname(req.files.import.name), function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            callback(null, fileName + path.extname(req.files.import.name));
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              data: JSON.stringify(err)
            });
          }
        );
      },

      function buildImported(result, callback) {
        fs.readFile(`./public/uploads/company_${req.user.code}/employee/import/${result}`, 'utf8', (err, file) => {
          if (err) {
            callback({
              code: 'ERR',
              data: err
            });
          }
          const dataObj = csv.toObject(file);
          const arr = [];
          dataObj.map((res, index) => {
            let employeeCode = new Promise((resolve, reject) => {
              resolve(generateEmployeeCode(APP, req, index + 1));
            });

            let newDate = new Date(res.dob);
            let tgl = newDate.getDate() + 1;

            if (tgl.length == 1) {
              tgl = '0' + newDate.getDate().toString();
            }

            let month = newDate.getMonth() + 1;
            let year = newDate.getFullYear().toString();

            res.plainPassword = Math.random()
              .toString(36)
              .slice(-8);

            res.status = 1;
            res.dob = new Date(`${year}-${month}-${tgl}`);
            res.company_code = req.user.code;
            res.password = bcrypt.hashSync(res.plainPassword, 10);

            employeeCode.then(code => {
              res.employee_code = code;
              res.user_name = code.replace(req.user.code + '-', '') + '_' + res.name.split(' ')[0].toLowerCase();
              arr.push(res);

              if (index + 1 == dataObj.length) {
                callback(null, arr);
              }
            });
          });
        });
      },

      function checkEmailEmployee(result, callback) {
        result.map((data, index) => {
          APP.models.company[req.user.db].mysql.employee
            .findAll({
              where: {
                email: data.email
              }
            })
            .then(res => {
              if (res && res.length > 0) {
                return callback({
                  code: 'DUPLICATE',
                  message: `Error! Duplicate Email! ${data.email}`,
                  info: {
                    dataCount: res.length,
                    parameter: 'email'
                  }
                });
              }
              if (result.length == index + 1) {
                return callback(null, result);
              }
            })
            .catch(err => {
              console.log('iki error email', err);

              return callback({
                code: 'ERR_DATABASE',
                data: JSON.stringify(err)
              });
            });
        });
      },

      function checkTelpEmployee(result, callback) {
        result.map((data, index) => {
          APP.models.company[req.user.db].mysql.employee
            .findAll({
              where: {
                tlp: data.tlp
              }
            })
            .then(res => {
              if (res && res.length > 0) {
                return callback({
                  code: 'DUPLICATE',
                  message: `Error! Duplicate telp ${data.tlp}!`,
                  info: {
                    dataCount: res.length,
                    parameter: 'telp'
                  }
                });
              }
              if (result.length == index + 1) {
                return callback(null, result);
              }
            })
            .catch(err => {
              console.log('iki error telp', err);

              return callback({
                code: 'ERR_DATABASE',
                data: JSON.stringify(err)
              });
            });
        });
      },

      function insertData(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .bulkCreate(result)
          .then(res => {
            result.map(data => {
              // send to email
              APP.mailer.sendMail({
                subject: 'Account Created',
                to: data.email,
                data: {
                  username: data.user_name,
                  pass: data.plainPassword
                },
                file: 'create_employee.html'
              });
            });

            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log('error insert', err);

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

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
