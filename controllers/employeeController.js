'use strict';

const async = require('async');
const trycatch = require('trycatch');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const csv = require('csvjson');
const moment = require('moment');
const axios = require('axios');

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

    kode = req.user.code + '-' + time + str;

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

const checkEmployeeEntry = (APP, req, callback) => {
  async.waterfall(
    [
      function checkUsernameEmployee(callback) {
        if (!req.body.username) return callback(null, true);

        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              user_name: req.body.username
            }
          })
          .then(res => {
            if (res && res.length > 0) {
              return callback({
                code: 'DUPLICATE',
                message: 'Error! Duplicate Username!',
                info: {
                  dataCount: res.length,
                  parameter: 'username'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              info: {
                parameter: 'username'
              }
            });
          })
          .catch(err => {
            console.log('iki error username', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function checkEmailEmployee(data, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findAll({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            if (res && res.length > 0) {
              return callback({
                code: 'DUPLICATE',
                message: 'Error! Duplicate Email!',
                info: {
                  dataCount: res.length,
                  parameter: 'email'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              info: {
                parameter: 'email'
              }
            });
          })
          .catch(err => {
            console.log('iki error email', err);

            callback({
              code: 'ERR_DATABASE',
              data: err
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
              return callback({
                code: 'DUPLICATE',
                message: 'Error! Duplicate telp!',
                info: {
                  dataCount: res.length,
                  parameter: 'telp'
                }
              });
            }
            callback(null, {
              code: 'NOT_FOUND',
              info: {
                parameter: 'telp'
              }
            });
          })
          .catch(err => {
            console.log('iki error telp', err);

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

exports.listEmployee = (APP, req, callback) => {
  let { employee, grade, department } = APP.models.company[req.user.db].mysql;

  employee.belongsTo(grade, {
    targetKey: 'id',
    foreignKey: 'grade_id'
  });

  employee.belongsTo(department, {
    targetKey: 'id',
    foreignKey: 'department_id'
  });

  employee
    .findAll({
      attributes: req.user.level == 3 ? ['id', 'name'] : { exclude: ['password', 'old_password'] },
      include: [
        {
          model: grade,
          attributes: ['id', 'name', 'description']
        },
        {
          model: department,
          attributes: ['id', 'name', 'description']
        }
      ]
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          message: 'Employee list tidak ditemukan!'
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

exports.viewEmployeeInfo = (APP, req, callback) => {
  if (req.user.level === 2 || req.user.level === 3) {
    let {
      employee,
      department,
      grade,
      grade_benefit,
      benefit,
      benefit_custom,
      benefit_active,
      job_title,
      status_contract,
      violation,
      absent_cuti,
      absent_type,
      cuti_type,
      presence,
      presence_setting,
      branch,
      device
    } = APP.models.company[req.user.db].mysql;

    async.waterfall(
      [
        function checkBenefitAvaibility(callback) {
          benefit_active.belongsTo(benefit, {
            targetKey: 'id',
            foreignKey: 'benefit_id'
          });

          benefit_active
            .findAll({
              include: [
                {
                  model: benefit,
                  attributes: ['id', 'name', 'description']
                }
              ]
            })
            .then(res => {
              Promise.all(
                res.map(x => {
                  if (x.benefit == null) {
                    console.log(`id ${x.id} = null`);
                    return x.id;
                  } else {
                    console.log(`id ${x.id} = ADA`);
                  }
                })
              )
                .then(arr => {
                  benefit_active
                    .destroy({
                      where: {
                        id: arr
                      }
                    })
                    .then(deleted => {
                      callback(null, deleted);
                    })
                    .catch(err => {
                      console.log('Error destroy checkBenefitAvaibility', err);
                      callback({
                        code: 'ERR_DATABASE',
                        id: '',
                        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                        data: err
                      });
                    });
                })
                .catch(err => {
                  console.log('Error checkBenefitAvaibility', err);
                  callback({
                    code: 'ERR',
                    id: '?',
                    message: 'Terjadi Kesalahan, mohon coba kembali',
                    data: err
                  });
                });
            });
        },

        function getEmployeeInfo(result, callback) {
          employee.belongsTo(grade, {
            targetKey: 'id',
            foreignKey: 'grade_id'
          });

          // grade.hasMany(grade_benefit, {
          //   sourceKey: 'id',
          //   foreignKey: 'grade_id'
          // });

          // grade_benefit.belongsTo(benefit, {
          //   targetKey: 'id',
          //   foreignKey: 'benefit_id'
          // });

          employee.hasMany(benefit_custom, {
            sourceKey: 'id',
            foreignKey: 'employee_id'
          });

          employee.hasMany(benefit_active, {
            sourceKey: 'id',
            foreignKey: 'employee_id'
          });

          benefit_active.belongsTo(benefit, {
            targetKey: 'id',
            foreignKey: 'benefit_id'
          });

          employee.belongsTo(department, {
            targetKey: 'id',
            foreignKey: 'department_id'
          });

          employee.belongsTo(job_title, {
            targetKey: 'id',
            foreignKey: 'job_title_id'
          });

          employee.belongsTo(status_contract, {
            targetKey: 'id',
            foreignKey: 'status_contract_id'
          });

          employee.hasMany(violation, {
            sourceKey: 'id',
            foreignKey: 'employee_id'
          });

          employee.hasMany(absent_cuti, {
            sourceKey: 'id',
            foreignKey: 'user_id'
          });

          absent_cuti.belongsTo(absent_type, {
            targetKey: 'code',
            foreignKey: 'absent_cuti_type_code'
            // as: 'absent_type'
          });

          absent_cuti.belongsTo(cuti_type, {
            targetKey: 'code',
            foreignKey: 'absent_cuti_type_code'
            // as: 'cuti_type'
          });

          employee.hasMany(presence, {
            sourceKey: 'id',
            foreignKey: 'user_id'
          });

          presence.belongsTo(presence_setting, {
            targetKey: 'id',
            foreignKey: 'presence_setting_id'
          });

          employee
            .findOne({
              attributes: { exclude: ['password', 'old_password'] },
              include: [
                {
                  model: grade,
                  attributes: ['id', 'code', 'name', 'description']
                  // include: [
                  //   {
                  //     model: grade_benefit,
                  //     attributes: ['id', 'grade_id', 'benefit_id'],
                  //     include: [
                  //       {
                  //         model: benefit,
                  //         attributes: ['id', 'code', 'name', 'description']
                  //       }
                  //     ]
                  //   }
                  // ]
                },
                {
                  model: benefit_custom,
                  attributes: ['id', 'name', 'description', 'status', 'upload']
                },
                {
                  model: benefit_active,
                  attributes: ['id', 'employee_id', 'benefit_id', 'status'],
                  include: [
                    {
                      model: benefit,
                      attributes: ['id', 'name', 'description']
                    }
                  ]
                },
                {
                  model: department,
                  attributes: ['id', 'code', 'name', 'description']
                },
                {
                  model: job_title,
                  attributes: ['id', 'code', 'name', 'description']
                },
                {
                  model: status_contract,
                  attributes: ['id', 'code', 'name', 'description']
                },
                {
                  model: violation,
                  attributes: ['id', 'code', 'sequence', 'name', 'description', 'doc_upload', 'created_at']
                },
                {
                  model: absent_cuti,
                  attributes: [
                    'id',
                    'absent_cuti_type_id',
                    'code',
                    'type',
                    'date_start',
                    'date_end',
                    'time_start',
                    'time_end',
                    'time_total'
                  ],
                  limit: 5,
                  order: [['id', 'DESC']],
                  include: [
                    {
                      model: absent_type
                      // as: 'absent_type'
                    },
                    {
                      model: cuti_type
                      // as: 'cuti_type'
                    }
                  ]
                },
                {
                  model: presence,
                  attributes: [
                    'id',
                    'check_in_device_id',
                    'check_out_device_id',
                    'check_in_branch_id',
                    'check_out_branch_id',
                    'date',
                    'check_in',
                    'check_out',
                    'total_time',
                    'total_minus',
                    'total_over',
                    'presence_setting_id'
                  ],
                  limit: 5,
                  order: [['id', 'DESC']],
                  include: [
                    {
                      model: presence_setting,
                      attributes: ['id', 'value', 'description']
                    }
                  ]
                }
              ],
              where: {
                id: req.user.level == 3 ? req.user.id : req.body.id
              }
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
        }
      ],
      (err, result) => {
        if (err) return callback(err);

        callback(null, result);
      }
    );
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};

exports.addEmployee = (APP, req, callback) => {
  async.waterfall(
    [
      function checkDataEntry(callback) {
        checkEmployeeEntry(APP, req, callback);
      },

      function generateCode(result, callback) {
        let code = new Promise((resolve, reject) => {
          resolve(generateEmployeeCode(APP, req));
        });

        code
          .then(res => {
            callback(null, res);
          })
          .catch(err => {
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function generatePassword(result, callback) {
        let randomPass = Math.random()
          .toString(36)
          .slice(-8);
        // let pass = APP.validation.password(randomPass);

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
            console.log('error pas enkrip', err);

            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function registerToSupportPal(data, callback) {
        let fullname = req.body.name.split(' ');
        let firstname = fullname[0];
        let lastname = fullname[fullname.length - 1];

        axios({
          method: 'POST',
          auth: {
            username: process.env.SUPP_TOKEN,
            password: ''
          },
          url: `${process.env.SUPP_HOST}/api/user/user`,
          data: {
            brand_id: process.env.SUPP_BRAND_ID,
            firstname: firstname,
            lastname: lastname,
            email: req.body.email,
            password: data.pass,
            organisation: 'CEKLOK'
          }
        })
          .then(res => {
            callback(null, {
              kode: data.kode,
              pass: data.pass,
              encryptedPass: data.encryptedPass,
              support: res.data.data
            });
          })
          .catch(err => {
            if (
              err.response.data.status == 'error' &&
              err.response.data.message == 'The email has already been taken.'
            ) {
              callback(null, {
                kode: data.kode,
                pass: data.pass,
                encryptedPass: data.encryptedPass
              });
            } else {
              callback({
                code: 'ERR',
                message: err.response.data.message,
                data: err
              });
            }
          });
      },

      function getSupportPalId(data, callback) {
        if (data.support) return callback(null, data);

        axios({
          method: 'GET',
          auth: {
            username: process.env.SUPP_TOKEN,
            password: ''
          },
          url: `${process.env.SUPP_HOST}/api/user/user?email=${req.body.email}&brand_id=${process.env.SUPP_BRAND_ID}`
        })
          .then(res => {
            if (res.data.data.length == 0) {
              callback({
                code: 'NOT_FOUND',
                message: 'Email tidak ditemukan!'
              });
            } else {
              callback(null, {
                kode: data.kode,
                pass: data.pass,
                encryptedPass: data.encryptedPass,
                support: res.data.data[0]
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              message: err.response.data.message,
              data: err
            });
          });
      },

      function hitungCuti(data, callback) {
        APP.models.company[req.user.db].mysql.status_contract
          .findOne({
            where: {
              id: req.body.contract
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Status contract tidak ditemukan'
              });
            }

            data.status = res.dataValues;
            callback(null, data);
          });
      },

      function registerUser(data, callback) {
        let username = data.kode.replace(req.user.code + '-', '') + '_' + req.body.name.split(' ')[0].toLowerCase();
        let totalCuti =
          data.status.type === 1 && data.status.leave_setting === 1
            ? data.status.leave_permission - (data.status.leave_permission - (12 - (new Date().getMonth() + 1)))
            : 0;

        // validate input
        let validateEmail = APP.validation.email(req.body.email);
        let validateUsername = APP.validation.username(username);

        if (validateEmail && validateUsername) {
          APP.models.company[req.user.db].mysql.employee
            .build({
              // priviledge_id: req.body.priviledge,
              support_pal_id: data.support.id,
              grade_id: req.body.grade,
              department_id: req.body.department,
              job_title_id: req.body.job,
              benefit_id: req.body.benefit,
              status_contract_id: req.body.contract,
              schedule_id: req.body.schedule,
              total_cuti: totalCuti,
              employee_code: data.kode,
              company_code: req.user.code,
              nik: req.body.nik,
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
              user_name: username,
              password: data.encryptedPass,
              status: 1,
              fultime_at: data.status.type === 1 ? new Date() : null
            })
            .save()
            .then(result => {
              // send to email
              APP.mailer.sendMail({
                subject: 'Account Created',
                to: req.body.email,
                data: {
                  username: result.user_name,
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
                  code: 'INSERT_NONE',
                  data: params
                });
              }

              return callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        } else {
          if (validateEmail !== true) return callback(validateEmail);
          if (validateUsername !== true) return callback(validateUsername);
        }
      },

      function createEmployeeHistory(result, callback) {
        APP.models.mongo.employee_history
          .create({
            id: result.id,
            priviledge: result.priviledge_id,
            role: result.role_id,
            department: result.department_id,
            job_title: result.job_title_id,
            grade: result.grade_id,
            benefit: result.benefit_id,
            schedule: result.schedule_id,
            status_contract: result.status_contract_id,
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

exports.importEmployeeData = (APP, req, callback) => {
  async.waterfall(
    [
      function uploadDocuments(callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let importPath = `./public/uploads/company_${req.user.code}/employee/import/`;

            // if (!fs.existsSync(importPath)) {
            //   mkdirp.sync(importPath);
            // }

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
              data: err
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
          const dataObj = csv.toObject(file, {
            delimiter: /[,|;]+/, // optional
            quote: '"' // optional
          });
          Promise.all(
            dataObj.map((x, index) => {
              let plainPassword = Math.random()
                .toString(36)
                .slice(-8);

              let gender =
                APP.validation.checkCSV(x['Gender (L / P)']) == 'L'
                  ? 1
                  : APP.validation.checkCSV(x['Gender (L / P)']) == 'P'
                  ? 2
                  : 3;

              let employeeCode = new Promise((resolve, reject) => {
                resolve(generateEmployeeCode(APP, req, index + 1));
              });

              return employeeCode.then(code => {
                let obj = {
                  nik: APP.validation.checkCSV(x.NIK),
                  name: APP.validation.checkCSV(x.Name),
                  gender: gender,
                  pob: APP.validation.checkCSV(x['Tempat Lahir']),
                  dob: APP.validation.checkCSV(x['Tanggal Lahir']),
                  address: APP.validation.checkCSV(x.Alamat),
                  tlp: APP.validation.checkCSV(x.Telp),
                  email: APP.validation.checkCSV(x.Email),
                  grade_id: APP.validation.checkCSV(x.Grading),
                  job_title_id: APP.validation.checkCSV(x['Job Title']),
                  department_id: APP.validation.checkCSV(x.Department),
                  schedule_id: APP.validation.checkCSV(x['Shift Type']),
                  status_contract_id: APP.validation.checkCSV(x['Status Contract']),
                  status: 1,
                  employee_code: code,
                  company_code: req.user.code,
                  user_name: code.replace(req.user.code + '-', '') + '_' + x.Name.split(' ')[0].toLowerCase(),
                  plainPassword: plainPassword,
                  password: bcrypt.hashSync(plainPassword, 10)
                };

                return obj;
              });
            })
          )
            .then(arr => {
              callback(null, arr);
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR',
                data: err
              });
            });
        });
      },

      function registerToSupportPal(data, callback) {
        let arr = [];

        Promise.all(
          data.map((x, i) => {
            let fullname = x.name.split(' ');
            let firstname = fullname[0];
            let lastname = fullname[fullname.length - 1];

            return axios({
              method: 'POST',
              auth: {
                username: process.env.SUPP_TOKEN,
                password: ''
              },
              url: `${process.env.SUPP_HOST}/api/user/user`,
              data: {
                brand_id: process.env.SUPP_BRAND_ID,
                firstname: firstname,
                lastname: lastname,
                email: x.email,
                password: x.password,
                organisation: 'CEKLOK'
              }
            })
              .then(res => {
                arr.push(res.data.data);
                return true;
                // callback(null, {
                //   data: data,
                //   support: res.data.data
                // });
              })
              .catch(err => {
                console.log(err);

                if (
                  err.response.data.status == 'error' &&
                  err.response.data.message == 'The email has already been taken.'
                ) {
                  return true;
                } else {
                  callback({
                    code: 'ERR',
                    message: err.response.data.message,
                    data: err
                  });
                }
              });
          })
        )
          .then(() => {
            callback(null, {
              data: data,
              support: arr
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

      function getSupportPalId(data, callback) {
        if (data.support.length > 0) return callback(null, data);

        Promise.all(
          data.data.map((x, i) => {
            return axios({
              method: 'GET',
              auth: {
                username: process.env.SUPP_TOKEN,
                password: ''
              },
              url: `${process.env.SUPP_HOST}/api/user/user?email=${x.email}&brand_id=${process.env.SUPP_BRAND_ID}`
            })
              .then(res => {
                if (res.data.data.length == 0) {
                  callback({
                    code: 'NOT_FOUND',
                    message: 'Email tidak ditemukan!'
                  });
                } else {
                  return res.data.data[0];
                }
              })
              .catch(err => {
                console.log(err);
                callback({
                  code: 'ERR',
                  message: err.response.data.message,
                  data: err
                });
              });
          })
        )
          .then(arr => {
            callback(null, {
              data: data.data,
              support: arr
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

      function buildWithSupportPal(data, callback) {
        Promise.all(
          data.data.map((x, i) => {
            let obj = x;
            obj.support_pal_id = data.support[i].id;

            return obj;
          })
        )
          .then(arr => {
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

      function checkEmailEmployee(result, callback) {
        Promise.all(
          result.map((data, index) => {
            return APP.models.company[req.user.db].mysql.employee
              .findAll({
                where: {
                  email: data.email
                }
              })
              .then(res => {
                if (res && res.length > 0) {
                  return data.email;
                } else {
                  return true;
                }
              })
              .catch(err => {
                console.log('iki error email', err);

                return callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
        )
          .then(arr => {
            let filtered = arr.filter(x => x !== true);
            if (filtered.length > 0) {
              callback({
                code: 'DUPLICATE',
                message: `Error! Duplicate Email! ${filtered}`
              });
            } else {
              callback(null, result);
            }
          })
          .catch(err => {
            console.log('Error checkEmailEmployee', err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function checkTelpEmployee(result, callback) {
        Promise.all(
          result.map((data, index) => {
            return APP.models.company[req.user.db].mysql.employee
              .findAll({
                where: {
                  tlp: data.tlp
                }
              })
              .then(res => {
                if (res && res.length > 0) {
                  return data.tlp;
                } else {
                  return true;
                }
              })
              .catch(err => {
                console.log('iki error telp', err);

                return callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
        )
          .then(arr => {
            let filtered = arr.filter(x => x !== true);
            if (filtered.length > 0) {
              callback({
                code: 'DUPLICATE',
                message: `Error! Duplicate Telp! ${filtered}`
              });
            } else {
              callback(null, result);
            }
          })
          .catch(err => {
            console.log('Error checkTelpEmployee', err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function insertData(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .bulkCreate(result)
          .then(() => {
            callback(null, result);
          })
          .catch(err => {
            console.log('error insert', err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function sendToMail(result, callback) {
        try {
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
            data: result
          });
        } catch (err) {
          callback({
            code: 'ERR',
            data: err
          });
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.updateEmployeeInfo = (APP, req, callback) => {
  let { employee, benefit_active, benefit_custom } = APP.models.company[req.user.db].mysql;
  let { id, contract, benefit, custom } = req.body;
  async.waterfall(
    [
      function checkparams(callback) {
        if (id && contract && benefit && custom) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkEmployeeStatus(result, callback) {
        employee
          .findOne({
            where: {
              id: id,
              status: 1
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND'
              });
            } else {
              if (res.status_contract_id == contract) {
                callback(null, {
                  data: res.dataValues,
                  upload: false
                });
              } else {
                callback(null, {
                  data: res.dataValues,
                  upload: true
                });
              }
            }
          });
      },

      function uploadPath(result, callback) {
        trycatch(
          () => {
            if (result.upload) {
              if (!req.files || Object.keys(req.files).length === 0) {
                return callback({
                  code: 'INVALID_REQUEST',
                  id: '?',
                  message: 'Kesalahan pada parameter upload'
                });
              }

              APP.fileCheck(req.files.contract_upload.data, 'doc').then(res => {
                if (res == null) {
                  callback({
                    code: 'INVALID_REQUEST',
                    message: 'File yang diunggah tidak sesuai!'
                  });
                } else {
                  let fileName = new Date().toISOString().replace(/:|\./g, '');
                  let contractPath = `./public/uploads/company_${req.user.code}/employee/contract/`;

                  callback(null, {
                    contract: contractPath + fileName + path.extname(req.files.contract_upload.name),
                    current: result.data.status_contract_id,
                    upload: true
                  });
                }
              });
            } else {
              callback(null, {
                contract: result.status_contract_upload,
                current: result.data.status_contract_id,
                upload: false
              });
            }
          },
          err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          }
        );
      },

      function activateBenefit(result, callback) {
        if (benefit == null) {
          callback(null, result);
        } else {
          let benefits = benefit.split(',');

          benefit_active
            .findAll({
              where: {
                employee_id: id,
                benefit_id: benefits
              }
            })
            .then(res => {
              Promise.all(
                res.map(x => {
                  return benefit_active
                    .update(
                      {
                        status: x.status == 0 ? 1 : 0
                      },
                      {
                        where: {
                          benefit_id: x.benefit_id,
                          employee_id: x.employee_id
                        }
                      }
                    )
                    .then(updated => {
                      return updated;
                    });
                })
              )
                .then(arr => {
                  callback(null, result);
                })
                .catch(err => {
                  callback({
                    code: 'ERR',
                    data: err
                  });
                });
            });
        }
      },

      function activateCustomBenefit(result, callback) {
        if (custom == null) {
          callback(null, result);
        } else {
          let custom_benefits = custom.split(',');
          console.log(custom_benefits);

          benefit_custom
            .findAll({
              where: {
                id: custom_benefits,
                employee_id: id
              }
            })
            .then(res => {
              console.log(res.length);

              Promise.all(
                res.map(x => {
                  return benefit_custom
                    .update(
                      {
                        status: x.status == 0 ? 1 : 0
                      },
                      {
                        where: {
                          id: x.id,
                          employee_id: x.employee_id
                        }
                      }
                    )
                    .then(updated => {
                      return updated;
                    });
                })
              )
                .then(arr => {
                  callback(null, result);
                })
                .catch(err => {
                  callback({
                    code: 'ERR',
                    data: err
                  });
                });
            });
        }
      },

      function updateEmployeeInfo(result, callback) {
        employee
          .findOne({
            where: {
              id: id
            }
          })
          .then(res => {
            res
              .update({
                status_contract_id: contract,
                status_contract_upload: result.upload === true ? result.contract.slice(8) : result.contract
              })
              .then(updated => {
                if (result.upload) {
                  //upload file
                  if (req.files.contract_upload) {
                    req.files.contract_upload.mv(result.contract, function(err) {
                      if (err)
                        return callback({
                          code: 'ERR'
                        });
                    });
                  }
                  callback(null, { result, updated });
                } else {
                  callback(null, { result, updated });
                }
              })
              .catch(err => {
                console.log(err);

                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
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

      function updateEmployeeHistory(result, callback) {
        APP.models.mongo.employee_history
          .create({
            id: result.updated.id,
            priviledge: result.updated.priviledge_id,
            role: result.updated.role_id,
            department: result.updated.department_id,
            job_title: result.updated.job_title_id,
            grade: result.updated.grade_id,
            benefit: result.updated.benefit_id,
            benefit_upload: result.result.benefit,
            company_code: result.updated.company_code,
            employee_code: result.updated.employee_code,
            username: result.updated.user_name,
            password: result.updated.password,
            name: result.updated.name,
            gender: result.updated.gender,
            pob: result.updated.pob,
            dob: result.updated.dob,
            address: result.updated.address,
            kelurahan: result.updated.kelurahan,
            kecamatan: result.updated.kecamatan,
            city: result.updated.city,
            province: result.updated.province,
            zipcode: result.updated.zipcode,
            msisdn: result.updated.msisdn,
            tlp: result.updated.tlp,
            email: result.updated.email,
            status: result.updated.status,
            endpoint: req.originalUrl,
            date: req.currentDate,
            time: req.customTime,
            elapsed_time: req.elapsedTime || '0'
          })
          .then(res => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: res
            });
          })
          .catch(err => {
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

exports.updateEmployeeStatus = (APP, req, callback) => {
  if (req.user.level === 2) {
    let { employee, checklist, checklist_employee } = APP.models.company[req.user.db].mysql;
    let { id, checklist_id, status, desc } = req.body;

    async.waterfall(
      [
        function checkParams(callback) {
          if (id && checklist_id && status) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: '?',
              message: 'Kesalahan pada parameter'
            });
          }
        },

        function checkEmployeeStatus(result, callback) {
          employee
            .findOne({
              where: {
                id: id,
                status: 1
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND'
                });
              } else {
                callback(null, res.dataValues);
              }
            });
        },

        function checkChecklist(result, callback) {
          let arrChecklist = checklist_id.split(',');
          checklist
            .findAll({
              where: {
                id: arrChecklist
              }
            })
            .then(res => {
              if (res.length === arrChecklist.length) {
                callback(null, {
                  employee: result,
                  checklist: res
                });
              } else {
                callback({
                  code: 'INVALID_REQUEST',
                  id: '?',
                  message: 'Kesalahan pada parameter checklist'
                });
              }
            });
        },

        function insertEmployeeChecklist(result, callback) {
          trycatch(
            () => {
              if (!req.files || Object.keys(req.files).length === 0) {
                return callback({
                  code: 'ERR',
                  message: 'No files were uploaded.'
                });
              }

              Promise.all(
                result.checklist.map((x, i) => {
                  return APP.fileCheck(req.files.status_upload[i].data, 'doc').then(res => {
                    if (res == null) {
                      return callback({
                        code: 'INVALID_REQUEST',
                        message: 'File yang diunggah tidak sesuai!'
                      });
                    } else {
                      let obj = {};
                      let fileName = x.code + '_' + result.employee.nik;
                      let statusPath = `./public/uploads/company_${req.user.code}/employee/status/`;

                      obj.checklist_id = x.id;
                      obj.employee_id = id;
                      obj.description = desc;
                      obj.upload = statusPath.slice(8) + fileName + path.extname(req.files.status_upload[i].name);

                      req.files.status_upload[i].mv(
                        statusPath + fileName + path.extname(req.files.status_upload[i].name),
                        function(err) {
                          if (err)
                            return callback({
                              code: 'ERR'
                            });
                        }
                      );

                      return obj;
                    }
                  });
                })
              )
                .then(arr => {
                  checklist_employee
                    .bulkCreate(arr)
                    .then(res => {
                      callback(null, result);
                    })
                    .catch(err => {
                      console.log('err bulkCreate', err);
                      callback({
                        code: 'ERR',
                        data: err
                      });
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
            err => {
              console.log(err);

              callback({
                code: 'ERR',
                data: err
              });
            }
          );
        },

        function updateEmployeeStatus(result, callback) {
          employee
            .update(
              {
                status: status
              },
              {
                where: {
                  id: id
                }
              }
            )
            .then(updated => {
              callback(null, { result, updated });
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function updateEmployeeHistory(result, callback) {
          APP.models.mongo.employee_history
            .create({
              id: result.updated.id,
              priviledge: result.updated.priviledge_id,
              role: result.updated.role_id,
              department: result.updated.department_id,
              job_title: result.updated.job_title_id,
              grade: result.updated.grade_id,
              benefit: result.updated.benefit_id,
              benefit_upload: result.result.benefit,
              company_code: result.updated.company_code,
              employee_code: result.updated.employee_code,
              username: result.updated.user_name,
              password: result.updated.password,
              name: result.updated.name,
              gender: result.updated.gender,
              pob: result.updated.pob,
              dob: result.updated.dob,
              address: result.updated.address,
              kelurahan: result.updated.kelurahan,
              kecamatan: result.updated.kecamatan,
              city: result.updated.city,
              province: result.updated.province,
              zipcode: result.updated.zipcode,
              msisdn: result.updated.msisdn,
              tlp: result.updated.tlp,
              email: result.updated.email,
              status: result.updated.status,
              status_upload: result.result.status,
              endpoint: req.originalUrl,
              date: req.currentDate,
              time: req.customTime,
              elapsed_time: req.elapsedTime || '0'
            })
            .then(res => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                data: res
              });
            })
            .catch(err => {
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
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};

exports.updateEmployeeRotasi = (APP, req, callback) => {
  let { employee, department, job_title, grade } = APP.models.company[req.user.db].mysql;
  let { id, grade_id, job_id, department_id } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (id && grade_id && job_id && department_id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function checkEmployeeStatus(result, callback) {
        employee
          .findOne({
            where: {
              id: id,
              status: 1
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Employee tidak ditemukan!'
              });
            } else {
              callback(null, res.dataValues);
            }
          });
      },

      function checkGrade(result, callback) {
        grade
          .findOne({
            where: {
              id: grade_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Grade tidak ditemukan!'
              });
            } else {
              console.log(res.id);
              console.log(grade_id);

              if (result.grade_id == grade_id) {
                console.log('grade id sama');

                callback(null, {
                  data: result,
                  upload: {
                    grade: res.grade_upload
                  },
                  status: {
                    grade: false
                  }
                });
              } else {
                console.log('grade id beda');
                APP.fileCheck(req.files.grade_upload.data, 'doc').then(check => {
                  console.log('masuk pengecekan upload grade');

                  if (check == null) {
                    callback({
                      code: 'INVALID_REQUEST',
                      message: 'File grade yang diunggah tidak sesuai!'
                    });
                  } else {
                    console.log(check);

                    let fileName = new Date().toISOString().replace(/:|\./g, '');
                    let gradePath = `./public/uploads/company_${req.user.code}/employee/grade/`;

                    callback(null, {
                      data: result,
                      upload: {
                        grade: gradePath + fileName + path.extname(req.files.grade_upload.name)
                      },
                      status: {
                        grade: true
                      }
                    });
                  }
                });
              }
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

      function checkDepartment(result, callback) {
        department
          .findOne({
            where: {
              id: department_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Department tidak ditemukan!'
              });
            } else {
              if (result.data.department_id == department_id) {
                console.log('department id sama');

                result.status.department = false;
                result.upload.department = res.department_upload;
                callback(null, result);
              } else {
                console.log('department id beda');
                result.status.department = true;

                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let departmentPath = `./public/uploads/company_${req.user.code}/employee/department/`;

                APP.fileCheck(req.files.department_upload.data, 'doc').then(check => {
                  if (check == null) {
                    callback({
                      code: 'INVALID_REQUEST',
                      message: 'File department yang diunggah tidak sesuai!'
                    });
                  } else {
                    console.log(check);
                    result.upload.department =
                      departmentPath + fileName + path.extname(req.files.department_upload.name);
                    callback(null, result);
                  }
                });
              }
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

      function checkJobTitle(result, callback) {
        job_title
          .findOne({
            where: {
              id: job_id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Job Title tidak ditemukan!'
              });
            } else {
              if (result.data.job_title_id == job_id) {
                console.log('job id sama');
                result.status.job = false;
                result.upload.job = res.job_title_upload;
                callback(null, result);
              } else {
                console.log('job id beda');
                result.status.job = true;

                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let jobPath = `./public/uploads/company_${req.user.code}/employee/job_title/`;

                APP.fileCheck(req.files.job_upload.data, 'doc').then(check => {
                  if (check == null) {
                    callback({
                      code: 'INVALID_REQUEST',
                      message: 'File job yang diunggah tidak sesuai!'
                    });
                  } else {
                    console.log(check);
                    result.upload.job = jobPath + fileName + path.extname(req.files.job_upload.name);
                    callback(null, result);
                  }
                });
              }
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

      function updateEmployeeRotasi(result, callback) {
        employee
          .findOne({
            where: {
              id: id
            }
          })
          .then(res => {
            res
              .update({
                grade_id: grade_id,
                grade_upload: result.status.grade ? result.upload.grade.slice(8) : result.upload.grade,
                job_title_id: job_id,
                job_title_upload: result.status.job ? result.upload.job.slice(8) : result.upload.job,
                department_id: department_id,
                department_upload: result.status.department
                  ? result.upload.department.slice(8)
                  : result.upload.department
              })
              .then(updated => {
                if (result.status.grade) {
                  req.files.grade_upload.mv(result.upload.grade, function(err) {
                    if (err)
                      return callback({
                        code: 'ERR'
                      });
                  });
                }

                if (result.status.job) {
                  req.files.job_upload.mv(result.upload.job, function(err) {
                    if (err)
                      return callback({
                        code: 'ERR'
                      });
                  });
                }

                if (result.status.department) {
                  req.files.department_upload.mv(result.upload.department, function(err) {
                    if (err)
                      return callback({
                        code: 'ERR'
                      });
                  });
                }

                callback(null, { result, updated });
              })
              .catch(err => {
                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
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

      function updateEmployeeHistory(result, callback) {
        APP.models.mongo.employee_history
          .create({
            id: result.updated.id,
            priviledge: result.updated.priviledge_id,
            role: result.updated.role_id,
            department: result.updated.department_id,
            department_upload: result.result.department,
            job_title: result.updated.job_title_id,
            job_title_upload: result.result.job,
            grade: result.updated.grade_id,
            grade_upload: result.result.grade,
            benefit: result.updated.benefit_id,
            benefit_upload: result.result.benefit,
            company_code: result.updated.company_code,
            employee_code: result.updated.employee_code,
            username: result.updated.user_name,
            password: result.updated.password,
            name: result.updated.name,
            gender: result.updated.gender,
            pob: result.updated.pob,
            dob: result.updated.dob,
            address: result.updated.address,
            kelurahan: result.updated.kelurahan,
            kecamatan: result.updated.kecamatan,
            city: result.updated.city,
            province: result.updated.province,
            zipcode: result.updated.zipcode,
            msisdn: result.updated.msisdn,
            tlp: result.updated.tlp,
            email: result.updated.email,
            status: result.updated.status,
            endpoint: req.originalUrl,
            date: req.currentDate,
            time: req.customTime,
            elapsed_time: req.elapsedTime || '0'
          })
          .then(res => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: res
            });
          })
          .catch(err => {
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

exports.getSuratPeringatan = (APP, req, callback) => {
  let params = req.user.level == 3 ? { where: { id: req.user.id } } : {};
  APP.models.company[req.user.db].mysql.violation
    .findAll(params)
    .then(res => {
      callback(null, {
        code: res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.addSuratPeringatan = (APP, req, callback) => {
  let { employee, violation } = APP.models.company[req.user.db].mysql;
  let { id, name, desc } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (id && name && desc) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function generateCode(result, callback) {
        let kode = APP.generateCode(violation, 'VLT');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: '?',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function checkEmployee(result, callback) {
        employee
          .findOne({
            where: {
              id: id,
              status: 1 //aktif
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Employee tidak ditemukan atau tidak dalam status aktif!'
              });
            } else {
              callback(null, {
                code: result.code,
                employee: res.dataValues
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
      },

      function uploadPath(result, callback) {
        trycatch(
          () => {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                message: 'No files were uploaded.'
              });
            }

            APP.fileCheck(req.files.doc_upload.data, 'doc').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let docPath = `./public/uploads/company_${req.user.code}/employee/doc/`;

                callback(null, {
                  employee: result.employee,
                  code: result.code,
                  doc: req.files.doc_upload
                    ? docPath + fileName + path.extname(req.files.doc_upload.name)
                    : result.doc_upload
                });
              }
            });
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              data: err
            });
          }
        );
      },

      function insertViolation(result, callback) {
        let counter = 1;
        violation
          .findAll({
            where: {
              employee_id: id
            },
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length > 0) {
              counter = res[0].sequence + 1;
              if (res[0].sequence >= 3) {
                return callback({
                  code: 'INVALID_REQUEST',
                  message: 'Employee is already have 3 violation warnings!'
                });
              }
            }

            violation
              .create({
                employee_id: id,
                doc_upload: result.doc.slice(8), // slice 8 buat ngilangin './public'
                code: result.code,
                sequence: counter,
                name: name,
                description: desc,
                action_by: req.user.id
              })
              .then(inserted => {
                // upload file
                if (req.files.doc_upload) {
                  req.files.doc_upload.mv(result.doc, function(err) {
                    if (err)
                      return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parametrer upload!'
                      });
                  });
                }

                //send email
                APP.mailer.sendMail({
                  subject: 'Violation Warning',
                  to: result.employee.email,
                  data: {
                    desc: inserted.description
                  },
                  attachments: [
                    {
                      filename: result.doc.slice(49), // slice 49 buat ngambil nama file
                      path: req.protocol + '://' + req.get('host') + result.doc.slice(8) // slice 8 buat ngilangin './public'
                    }
                  ],
                  file: 'violation_warning.html'
                });
                callback(null, {
                  code: 'INSERT_SUCCESS',
                  data: inserted
                });
              })
              .catch(err => {
                console.log('insert error', err);
                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('find error', err);
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

exports.verifyEmployee = (APP, req, callback) => {
  console.log(req.user.db);

  let {
    employee,
    grade,
    grade_benefit,
    benefit,
    benefit_active,
    department,
    job_title,
    status_contract,
    schedule,
    presence
  } = APP.models.company[req.user.db].mysql;

  let { grade_id, department_id, job_title_id, status_contract_id, schedule_id } = req.body;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkBodyGrade(callback) {
          grade.hasMany(grade_benefit, {
            sourceKey: 'id',
            foreignKey: 'grade_id'
          });

          grade_benefit.belongsTo(benefit, {
            targetKey: 'id',
            foreignKey: 'benefit_id'
          });

          grade
            .findOne({
              include: [
                {
                  model: grade_benefit,
                  attributes: ['id', 'grade_id', 'benefit_id'],
                  include: [
                    {
                      model: benefit,
                      attributes: ['id', 'name', 'description']
                    }
                  ]
                }
              ],
              where: {
                id: grade_id
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'Kesalahan pada parameter grade'
                });
              } else {
                callback(null, {
                  grade: res.dataValues
                });
              }
            });
        },

        function checkBodyDepartment(result, callback) {
          department
            .findOne({
              where: {
                id: department_id
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'INVALID_REQUEST',
                  message: 'Kesalahan pada parameter department'
                });
              } else {
                callback(null, {
                  grade: result.grade,
                  department: res.dataValues
                });
              }
            });
        },

        function checkBodyJob(result, callback) {
          job_title
            .findOne({
              where: {
                id: job_title_id
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'Kesalahan pada parameter job'
                });
              } else {
                callback(null, {
                  grade: result.grade,
                  department: result.department,
                  job: res.dataValues
                });
              }
            });
        },

        function checkBodyStatusContract(result, callback) {
          status_contract
            .findOne({
              where: {
                id: status_contract_id
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'INVALID_REQUEST',
                  message: 'Kesalahan pada parameter contract'
                });
              } else {
                callback(null, {
                  grade: result.grade,
                  department: result.department,
                  job: result.job,
                  contract: res.dataValues
                });
              }
            });
        },

        function checkBodySchedule(result, callback) {
          schedule
            .findOne({
              where: {
                id: schedule_id
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'INVALID_REQUEST',
                  message: 'Kesalahan pada parameter schedule'
                });
              } else {
                callback(null, {
                  grade: result.grade,
                  department: result.department,
                  job: result.job,
                  contract: result.contract,
                  schedule: res.dataValues
                });
              }
            });
        },

        function uploadPath(result, callback) {
          try {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                id: 'BSQ96',
                message: 'Kesalahan pada parameter upload'
              });
            }

            APP.fileCheck(req.files.upload.data, 'doc').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let docPath = `./public/uploads/company_${req.user.code}/employee/contract/`;

                callback(null, {
                  grade: result.grade,
                  department: result.department,
                  job: result.job,
                  contract: result.contract,
                  schedule: result.schedule,
                  doc: docPath + fileName + path.extname(req.files.upload.name)
                });
              }
            });
          } catch (err) {
            console.log(err);
            callback({
              code: 'ERR',
              id: '?',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          }
        },

        function updateEmployeeInfo(result, callback) {
          employee
            .findOne({
              where: {
                email: req.body.email
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Email tidak terdaftar'
                });
              } else {
                if (res.status == 1) {
                  return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Akun sudah di verify'
                  });
                } else {
                  res
                    .update({
                      grade_id: grade_id,
                      department_id: department_id,
                      job_title_id: job_title_id,
                      status: 1,
                      status_contract_id: status_contract_id,
                      status_contract_upload: result.doc.slice(8),
                      schedule_id: schedule_id
                    })
                    .then(updated => {
                      callback(null, {
                        grade: result.grade,
                        department: result.department,
                        job: result.job,
                        contract: result.contract,
                        schedule: result.schedule,
                        updated: updated.dataValues
                      });
                    })
                    .catch(err => {
                      console.log('Error update updateEmployeeInfo', err);
                      callback({
                        code: 'ERR_DATABASE',
                        data: err
                      });
                    });
                }
              }
            })
            .catch(err => {
              console.log('Error findOne updateEmployeeInfo', err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function updateEmployeeBenefit(result, callback) {
          Promise.all(
            result.grade.grade_benefits.map(x => {
              let obj = {};

              obj.benefit_id = x.benefit_id;
              obj.employee_id = result.updated.id;

              return obj;
            })
          ).then(arr => {
            benefit_active
              .bulkCreate(arr)
              .then(() => {
                callback(null, result);
              })
              .catch(err => {
                console.log('Error updateEmployeeBenefit', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: '?',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          });
        },

        function createTodayPresence(result, callback) {
          presence
            .create({
              user_id: result.updated.id,
              schedule_id: result.updated.schedule_id,
              date: new Date(),
              presence_setting_id: 4 // WA
            })
            .then(res => {
              callback(null, result);
            })
            .catch(err => {
              console.log('Error createTodayPresence', err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function sendEmailAndUpload(result, callback) {
          try {
            //send to email
            APP.mailer.sendMail({
              subject: 'Account Verified',
              to: req.body.email,
              data: {
                grade: result.grade.name,
                department: result.department.name,
                job: result.job.name,
                contract: result.contract.name,
                schedule: {
                  name: result.schedule.name,
                  desc: result.schedule.description
                }
              },
              file: 'verify_employee.html'
            });

            // upload file
            if (req.files.upload) {
              req.files.upload.mv('./public' + result.updated.status_contract_upload, function(err) {
                if (err) {
                  console.log(err);
                  return callback({
                    code: 'ERR',
                    id: '?',
                    message: 'Terjadi Kesalahan upload, mohon coba kembali',
                    data: err
                  });
                }
              });
            }

            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: result
            });
          } catch (err) {
            console.log('3', err);
            callback({
              code: 'ERR',
              message: 'Error sendMail'
            });
          }
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
