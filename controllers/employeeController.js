'use strict';

const async = require('async');
const trycatch = require('trycatch');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const csv = require('csvjson');

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
      // function checkUsernameEmployee(callback) {
      //   APP.models.company[req.user.db].mysql.employee
      //     .findAll({
      //       where: {
      //         company_code: req.body.company,
      //         user_name: req.body.username
      //       }
      //     })
      //     .then(res => {
      //       if (res && res.length > 0) {
      //         callback({
      //           code: 'DUPLICATE',
      //           message: 'Error! Duplicate Username!',
      //           info: {
      //             dataCount: res.length,
      //             parameter: 'username'
      //           }
      //         });
      //       }
      //       callback(null, {
      //         code: 'NOT_FOUND',
      //         info: {
      //           parameter: 'username'
      //         }
      //       });
      //     })
      //     .catch(err => {
      //       console.log('iki error username', err);

      //       callback({
      //         code: 'ERR_DATABASE',
      //         data: err
      //       });
      //     });
      // },

      function checkEmailEmployee(callback) {
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
              callback({
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
  let { employee, grade } = APP.models.company[req.user.db].mysql;

  employee.belongsTo(grade, {
    targetKey: 'id',
    foreignKey: 'grade_id'
  });

  employee
    .findAll({
      include: [
        {
          model: grade,
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
    });
};

exports.viewEmployeeInfo = (APP, req, callback) => {
  let {
    employee,
    department,
    grade,
    grade_benefit,
    benefit,
    benefit_custom,
    job_title,
    status_contract,
    violation,
    absent_cuti,
    absent_type,
    cuti_type,
    presence
  } = APP.models.company[req.user.db].mysql;

  employee.belongsTo(grade, {
    targetKey: 'id',
    foreignKey: 'grade_id'
  });

  grade.hasMany(grade_benefit, {
    sourceKey: 'id',
    foreignKey: 'grade_id'
  });

  grade_benefit.belongsTo(benefit, {
    targetKey: 'id',
    foreignKey: 'benefit_id'
  });

  employee.hasMany(benefit_custom, {
    sourceKey: 'id',
    foreignKey: 'employee_id'
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
    foreignKey: 'absent_cuti_type_code',
    as: 'absent_type'
  });

  absent_cuti.belongsTo(cuti_type, {
    targetKey: 'code',
    foreignKey: 'absent_cuti_type_code',
    as: 'cuti_type'
  });

  employee.hasMany(presence, {
    sourceKey: 'id',
    foreignKey: 'user_id'
  });

  if (req.user.admin) {
    employee
      .findOne({
        include: [
          {
            model: grade,
            attributes: ['id', 'code', 'name', 'description'],
            include: [
              {
                model: grade_benefit,
                attributes: ['id', 'grade_id', 'benefit_id'],
                include: [
                  {
                    model: benefit,
                    attributes: ['id', 'code', 'name', 'description']
                  }
                ]
              }
            ]
          },
          {
            model: benefit_custom,
            attributes: ['id', 'name', 'description', 'upload']
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
            attributes: ['id', 'code', 'sequence', 'description', 'doc_upload']
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
            include: [
              {
                model: absent_type,
                as: 'absent_type'
              },
              {
                model: cuti_type,
                as: 'cuti_type'
              }
            ]
          },
          {
            model: presence
          }
        ],
        where: {
          id: req.body.id
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
  } else {
    callback(null, {
      code: 'OK',
      message: 'sek belum tau diisi apa'
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
              console.log('error pas enkrip', err);

              callback({
                code: 'ERR',
                data: err
              });
            });
        } else {
          return callback(pass);
        }
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
            callback(null, { data, status: res.dataValues });
          });
      },

      function registerUser(data, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(
          data.data.kode.replace(req.user.code + '-', '') + '_' + req.body.name.split(' ')[0].toLowerCase()
        );

        if (email && username) {
          APP.models.company[req.user.db].mysql.employee
            .build({
              // priviledge_id: req.body.priviledge,
              // role_id: req.body.role,
              grade_id: req.body.grade,
              department_id: req.body.department,
              job_title_id: req.body.job,
              benefit_id: req.body.benefit,
              status_contract_id: req.body.contract,
              schedule_id: req.body.schedule,
              total_cuti:
                data.status.type === 1 && data.status.leave_setting === 1
                  ? data.status.leave_permission - (data.status.leave_permission - (12 - (new Date().getMonth() + 1)))
                  : 0,
              employee_code: data.data.kode,
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
              user_name:
                data.data.kode.replace(req.user.code + '-', '') + '_' + req.body.name.split(' ')[0].toLowerCase(),
              password: data.data.encryptedPass,
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
                  pass: data.data.pass
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
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
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
  console.log(req.files);

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
                data: err
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
                data: err
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

exports.updateEmployeeInfo = (APP, req, callback) => {
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
            if (req.body.benefit == result.benefit_id && req.body.contract == result.status_contract_id) {
              return callback(null, {
                benefit: result.benefit_upload,
                contract: result.status_contract_upload
              });
            }
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let benefitPath = `./public/uploads/company_${req.user.code}/employee/benefit/`;
            let contractPath = `./public/uploads/company_${req.user.code}/employee/contract/`;

            // if (!fs.existsSync(benefitPath)) {
            //   mkdirp.sync(benefitPath);
            // }

            // if (!fs.existsSync(contractPath)) {
            //   mkdirp.sync(contractPath);
            // }

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

            if (req.files.contract_upload) {
              req.files.contract_upload.mv(
                contractPath + fileName + path.extname(req.files.contract_upload.name),
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
                ? benefitPath.slice(8) + fileName + path.extname(req.files.benefit_upload.name)
                : result.benefit_upload,
              contract: req.files.contract_upload
                ? contractPath.slice(8) + fileName + path.extname(req.files.contract_upload.name)
                : result.contract_upload
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
                benefit_id: req.body.benefit,
                benefit_upload: result.benefit,
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
                status_contract_id: req.body.contract,
                status_contract_upload: result.contract
              })
              .then(updated => {
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
            let statusPath = `./public/uploads/company_${req.user.code}/employee/status/`;

            if (!fs.existsSync(statusPath)) {
              mkdirp.sync(statusPath);
            }

            if (req.files.status_upload) {
              req.files.status_upload.mv(statusPath + fileName + path.extname(req.files.status_upload.name), function(
                err
              ) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            callback(null, {
              status: req.files.status_upload
                ? statusPath + fileName + path.extname(req.files.status_upload.name)
                : result.status_upload
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
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            res
              .update({
                status: req.body.status,
                status_upload: result.status
              })
              .then(updated => {
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
};

exports.updateEmployeeRotasi = (APP, req, callback) => {
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
            let gradePath = `./public/uploads/company_${req.user.code}/employee/grade/`;
            let jobPath = `./public/uploads/company_${req.user.code}/employee/job_title/`;
            let departmentPath = `./public/uploads/company_${req.user.code}/employee/department/`;

            if (!fs.existsSync(gradePath)) {
              mkdirp.sync(gradePath);
            }

            if (!fs.existsSync(jobPath)) {
              mkdirp.sync(jobPath);
            }

            if (!fs.existsSync(departmentPath)) {
              mkdirp.sync(departmentPath);
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
              req.files.job_upload.mv(jobPath + fileName + path.extname(req.files.job_upload.name), function(err) {
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
              grade: req.files.grade_upload
                ? gradePath + fileName + path.extname(req.files.grade_upload.name)
                : result.grade_upload,
              job: req.files.job_upload
                ? jobPath + fileName + path.extname(req.files.job_upload.name)
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
              data: err
            });
          }
        );
      },

      function updateEmployeeRotasi(result, callback) {
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            res
              .update({
                grade_id: req.body.grade,
                grade_upload: result.grade,
                job_title_id: req.body.job,
                job_title_upload: result.job,
                department_id: req.body.department,
                department_upload: result.department
              })
              .then(updated => {
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
  APP.models.company[req.user.db].mysql.violation
    .findAll()
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
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'VLT000';
        let kode = '';

        APP.models.company[req.user.db].mysql.violation
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              kode = pad.substring(0, pad.length - str.length) + str;

              callback(null, kode);
            } else {
              console.log('ada');
              console.log(res[0].code);

              let lastID = res[0].code;
              let replace = lastID.replace('VLT', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
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
                code: 'ERR',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let docPath = `./public/uploads/company_${req.user.code}/employee/doc/`;

            callback(null, {
              code: result,
              doc: req.files.doc_upload
                ? docPath + fileName + path.extname(req.files.doc_upload.name)
                : result.doc_upload
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
        // add employee to violation
        APP.models.company[req.user.db].mysql.violation.belongsTo(APP.models.company[req.user.db].mysql.employee, {
          targetKey: 'id',
          foreignKey: 'employee_id'
        });

        let counter = 1;
        APP.models.company[req.user.db].mysql.violation
          .findAll({
            include: [
              {
                model: APP.models.company[req.user.db].mysql.employee
              }
            ],
            where: {
              employee_id: req.body.id
            },
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length > 0) {
              counter = res[0].sequence + 1;
              if (res[0].sequence >= 3) {
                return callback({
                  code: 'ERR',
                  message: 'Employee is already have 3 violation warnings!'
                });
              }
            }

            // upload file
            if (req.files.doc_upload) {
              req.files.doc_upload.mv(result.doc, function(err) {
                if (err)
                  return callback({
                    code: 'ERR'
                  });
              });
            }

            APP.models.company[req.user.db].mysql.violation
              .create({
                employee_id: req.body.id,
                doc_upload: result.doc.slice(8), // slice 8 buat ngilangin './public'
                code: result.code,
                sequence: counter,
                description: `Surat Peringatan ${counter}`
              })
              .then(inserted => {
                //send email
                APP.mailer.sendMail({
                  subject: 'Violation Warning',
                  to: res[0].employee.email,
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
