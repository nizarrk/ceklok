'use strict';

const async = require('async');
const trycatch = require('trycatch');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

exports.addEmployee = (APP, req, callback) => {
  async.waterfall(
    [
      function checkUsernameEmployee(callback) {
        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              company_code: req.body.company,
              user_name: req.body.username
            }
          })
          .then(res => {
            if (res && res.length > 0) {
              callback({
                code: 'DUPLICATE',
                data: {
                  row: 'Error! Duplicate Username!'
                },
                info: {
                  dataCount: res.length,
                  parameter: 'username'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              data: {
                row: []
              },
              info: {
                dataCount: res.length,
                parameter: 'username'
              }
            });
          })
          .catch(err => {
            console.log('iki error username', err);

            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function checkEmailEmployee(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            if (res && res.length > 0) {
              callback({
                code: 'DUPLICATE',
                data: {
                  row: 'Error! Duplicate Email!'
                },
                info: {
                  dataCount: res.length,
                  parameter: 'email'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              data: {
                row: []
              },
              info: {
                dataCount: res.length,
                parameter: 'email'
              }
            });
          })
          .catch(err => {
            console.log('iki error email', err);

            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function checkTelpEmployee(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              tlp: req.body.telp
            }
          })
          .then(res => {
            if (res && res.length > 0) {
              callback({
                code: 'DUPLICATE',
                data: {
                  row: 'Error! Duplicate telp!'
                },
                info: {
                  dataCount: res.length,
                  parameter: 'telp'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              data: {
                row: []
              },
              info: {
                dataCount: res.length,
                parameter: 'telp'
              }
            });
          })
          .catch(err => {
            console.log('iki error telp', err);

            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function generateEmployeeCode(result, callback) {
        let tgl = new Date().getDate().toString();
        let month = new Date().getMonth().toString();
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;
        let pad = '0000';

        APP.models.company[req.user.db].mysql.employee
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              let ans = pad.substring(0, pad.length - str.length) + str;

              let kode = req.body.company + '-' + time + '-' + ans;

              callback(null, kode);
            } else {
              console.log('ada');
              let lastID = res[0].employee_code;
              let replace = lastID.replace(req.body.company + '-' + time + '-', '');

              let str = '' + parseInt(replace) + 1;
              let ans = pad.substring(0, pad.length - str.length) + str;

              let kode = req.body.company + '-' + time + '-' + ans;

              callback(null, kode);
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function generatePassword(result, callback) {
        let randomPass = Math.random()
          .toString(36)
          .slice(-8);
        let pass = APP.validation.password(randomPass);
        if (pass === true) {
          bcrypt
            .hash(randomPass, 10)
            .then(hashed => {
              return callback(null, {
                kode: result,
                pass: randomPass,
                encryptedPass: hashed
              });
            })
            .catch(err => {
              callback({
                code: 'ERR_BCRYPT',
                data: JSON.stringify(err)
              });
            });
        } else {
          return callback(pass);
        }
      },

      function registerUser(data, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email && username) {
          APP.models.company[req.user.db].mysql.employee
            .build({
              role_id: req.body.role,
              grade_id: req.body.grade,
              department_id: req.body.department,
              job_title_id: req.body.job,
              benefit_id: req.body.benefit,
              employee_code: data.kode,
              company_code: req.body.company,
              name: req.body.name,
              gender: req.body.gender,
              pob: req.body.pob,
              dob: req.body.dob,
              address: req.body.address,
              kelurahan: req.body.kel,
              kecamatan: req.body.kec,
              city: req.body.city,
              province: req.body.prov,
              zipcode: req.body.zip,
              msisdn: 'default',
              tlp: req.body.telp,
              email: req.body.email,
              user_name: req.body.username,
              password: data.encryptedPass,
              status: 1
            })
            .save()
            .then(result => {
              // send to email
              APP.mailer.sendMail({
                subject: 'Account Created',
                to: req.body.email,
                data: {
                  username: req.body.username,
                  pass: data.pass
                },
                file: 'create_employee.html'
              });
              let params = 'Insert Success'; //This is only example, Object can also be used
              return callback(null, result.dataValues);
            })
            .catch(err => {
              console.log(err);

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
                data: JSON.stringify(err)
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function createEmployeeHistory(result, callback) {
        APP.models.mongo.employee_history
          .create({
            id: result.id,
            role: result.role_id,
            department: result.department_id,
            job_title: result.job_title_id,
            grade: result.grade_id,
            benefit: result.benefit_id,
            company_code: result.company_code,
            employee_code: result.employee_code,
            username: result.user_name,
            password: result.password,
            name: result.name,
            gender: result.gender,
            pob: result.pob,
            dob: result.dob,
            address: result.address,
            kelurahan: result.kelurahan,
            kecamatan: result.kecamatan,
            city: result.city,
            province: result.province,
            zipcode: result.zipcode,
            msisdn: result.msisdn,
            tlp: result.tlp,
            email: result.email,
            status: result.status,
            endpoint: req.originalUrl,
            date: req.currentDate,
            time: req.customTime,
            elapsed_time: req.elapsedTime || '0'
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
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

exports.updateEmployee = (APP, req, callback) => {
  async.waterfall(
    [
      function checkEmployeeStatus(callback) {
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              id: req.body.id,
              status: 1
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND'
              });
            }

            callback(null, res);
          });
      },

      function uploadDocuments(result, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let benefitPath = './uploads/company/benefit/';
            let gradePath = './uploads/company/grade/';
            let job_titlePath = './uploads/company/job_title/';
            let departmentPath = './uploads/company/department/';

            if (!fs.existsSync(benefitPath)) {
              fs.mkdirSync(benefitPath);
            }

            if (!fs.existsSync(gradePath)) {
              fs.mkdirSync(gradePath);
            }

            if (!fs.existsSync(job_titlePath)) {
              fs.mkdirSync(job_titlePath);
            }

            if (!fs.existsSync(departmentPath)) {
              fs.mkdirSync(departmentPath);
            }

            if (req.files.benefit_upload) {
              req.files.benefit_upload.mv(
                benefitPath + fileName + path.extname(req.files.benefit_upload.name),
                function(err) {
                  if (err)
                    return callback({
                      code: 'ERR'
                    });
                }
              );
            }

            if (req.files.grade_upload) {
              req.files.grade_upload.mv(gradePath + fileName + path.extname(req.files.grade_upload.name), function(
                err
              ) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            if (req.files.job_upload) {
              req.files.job_upload.mv(job_titlePath + fileName + path.extname(req.files.job_upload.name), function(
                err
              ) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            if (req.files.department_upload) {
              req.files.department_upload.mv(
                departmentPath + fileName + path.extname(req.files.department_upload.name),
                function(err) {
                  if (err)
                    return callback({
                      code: 'ERR'
                    });
                }
              );
            }

            callback(null, {
              benefit: req.files.benefit_upload
                ? benefitPath + fileName + path.extname(req.files.benefit_upload.name)
                : result.benefit_upload,
              grade: req.files.grade_upload
                ? gradePath + fileName + path.extname(req.files.grade_upload.name)
                : result.grade_upload,
              job: req.files.job_upload
                ? job_titlePath + fileName + path.extname(req.files.job_title_upload)
                : result.job_title_upload,
              department: req.files.department_upload
                ? departmentPath + fileName + path.extname(req.files.department_upload.name)
                : result.department_upload
            });
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

      function updateEmployeeInfo(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            res
              .update({
                department_id: req.body.department,
                department_upload: result.department,
                grade_id: req.body.grade,
                grade_upload: result.grade,
                benefit_id: req.body.benefit,
                benefit_upload: result.benefit,
                job_title_id: req.body.job,
                job_title_upload: result.job,
                name: req.body.name,
                gender: req.body.gender,
                pob: req.body.pob,
                dob: req.body.dob,
                address: req.body.address,
                kelurahan: req.body.kel,
                kecamatan: req.body.kec,
                city: req.body.city,
                province: req.body.prov,
                zipcode: req.body.zip,
                msisdn: 'default',
                tlp: req.body.telp,
                email: req.body.email,
                user_name: req.body.username
              })
              .then(result => {
                callback(null, result);
              })
              .catch(err => {
                callback({
                  code: 'ERR_DATABASE',
                  data: JSON.stringify(err)
                });
              });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function updateEmployeeHistory(result, callback) {
        APP.models.mongo.employee_history
          .create({
            id: result.id,
            role: result.role_id,
            department: result.department_id,
            job_title: result.job_title_id,
            grade: result.grade_id,
            benefit: result.benefit_id,
            company_code: result.company_code,
            employee_code: result.employee_code,
            username: result.user_name,
            password: result.password,
            name: result.name,
            gender: result.gender,
            pob: result.pob,
            dob: result.dob,
            address: result.address,
            kelurahan: result.kelurahan,
            kecamatan: result.kecamatan,
            city: result.city,
            province: result.province,
            zipcode: result.zipcode,
            msisdn: result.msisdn,
            tlp: result.tlp,
            email: result.email,
            status: result.status,
            endpoint: req.originalUrl,
            date: req.currentDate,
            time: req.customTime,
            elapsed_time: req.elapsedTime || '0'
          })
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              data: res
            });
          })
          .catch(err => {
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
