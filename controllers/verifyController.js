'use strict';

const bcrypt = require('bcrypt');
const async = require('async');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const trycatch = require('trycatch');
const key = require('../config/jwt-key.json');
const jwt = require('jsonwebtoken');

exports.tes = (APP, result, req, callback) => {
  console.log(result);

  let {
    admin_app,
    payment,
    company,
    admin,
    pricing,
    pricing_feature,
    feature,
    feature_type,
    subfeature,
    payment_method,
    payment_detail,
    presence_setting
  } = APP.models.mysql;
  async.waterfall(
    [
      function generateCompanyCode(callback) {
        let tgl = new Date().getDate().toString();
        if (tgl.length == 1) {
          tgl = '0' + new Date().getDate().toString();
        }
        let month = new Date().getMonth() + 1;
        let year = new Date()
          .getFullYear()
          .toString()
          .slice(2, 4);
        let time = year + month + tgl;

        company
          .findOne({
            where: {
              id: result.company.id
            }
          })
          .then(res => {
            let array = res.name.split(' ');
            let code = '';

            array.map(res => {
              code += res[0].toUpperCase();
            });

            let companyCode = code + time + '0'; // 0 is numbering index
            company
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
                    companyCode
                  });
                } else {
                  let lastID = res[0].company_code;
                  let replace = lastID.replace(code + time, '');
                  let num = parseInt(replace) + 1;

                  companyCode = code + time + num;

                  callback(null, {
                    companyCode
                  });
                }
              })
              .catch(err => {
                console.log('Error generateCompanyCode', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'PVQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          });
      },

      function updateCompany(data, callback) {
        company
          .findOne({
            where: {
              id: result.company.id
            }
          })
          .then(res => {
            res
              .update({
                company_code: data.companyCode,
                payment_status: 0,
                status: 0
              })
              .then(result => {
                callback(null, { company: result, code: data.companyCode });
              })
              .catch(err => {
                console.log('Error update updateCompany', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'PVQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error findone updateCompany', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function updateAdmin(data, callback) {
        admin
          .findOne({
            where: {
              company_id: result.company.id
            }
          })
          .then(res => {
            res
              .update({
                // user_type_id: 1,
                company_code: data.code,
                status: 0
              })
              .then(result => {
                callback(null, {
                  company: data.company,
                  admin: result
                });
              })
              .catch(err => {
                console.log('Error update updateAdmin', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'PVQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: err
                });
              });
          })
          .catch(err => {
            console.log('Error findone updateAdmin', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function sendEmail(data, callback) {
        // add payment_method and pricing to payment
        payment.belongsTo(payment_method, {
          targetKey: 'id',
          foreignKey: 'payment_method_id'
        });
        payment_detail.belongsTo(pricing, {
          targetKey: 'id',
          foreignKey: 'item_id'
        });

        payment.hasMany(payment_detail, {
          sourceKey: 'id',
          foreignKey: 'payment_id'
        });

        payment
          .findOne({
            include: [
              {
                model: payment_method
              },
              {
                model: payment_detail,
                include: [
                  {
                    model: pricing
                  }
                ]
              }
            ],
            where: {
              id: result.payment.id
            }
          })
          .then(res => {
            //send to email
            APP.mailer.sendMail({
              subject: 'Company Verified',
              to: data.admin.email,
              data: {
                payment: res,
                company: data.company
              },
              file: 'verify_company.html'
            });

            callback(null, {
              payment: res,
              company: data.company
            });
          })
          .catch(err => {
            console.log('Error sendEmail', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function createCompanyDB(data, callback) {
        let dbName = `${process.env.MYSQL_NAME}_${data.company.company_code}`;

        APP.db.sequelize
          .query(`CREATE DATABASE ${dbName}`)
          .then(() => {
            callback(null, { dbName, data });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function createTable(data, callback) {
        fs.readdir(path.join(__dirname, '../models/template'), (err, files) => {
          if (err) {
            console.log(err);
            return callback({
              code: 'ERR',
              data: err
            });
          }

          let models = {};
          let x = [];
          let n = 1;
          let len = files.length;

          Promise.all(
            files.map(file => {
              let tableName = file.replace('.js', '');
              x.push(file);
              return APP.db.sequelize
                .query(`CREATE TABLE ${data.dbName}.${tableName} LIKE ${process.env.MYSQL_NAME}.${tableName}`)
                .then(() => {
                  x.map(model => {
                    let Model = APP.db
                      .customSequelize(data.dbName)
                      .import(path.join(__dirname, '../models/template/', model));
                    let modelName = model.replace('.js', '');

                    models[modelName] = Model;

                    if (n === len) {
                      let mysqls = {
                        mysql: {}
                      };

                      Object.keys(models).forEach(val => {
                        if (models[val].associate) models[val].associate(models);

                        mysqls.mysql[val] = models[val];
                        APP.models.company[data.dbName] = mysqls;
                      });
                    }

                    n++;
                  });
                });
            })
          )
            .then(() => {
              callback(null, data);
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR',
                data: err
              });
            });
        });
        // return callback(null, {
        //   code: 'UPDATE_SUCCESS',
        //   id: 'PVP00',
        //   message: 'Validasi pembayaran berhasil!',
        //   data: {
        //     data
        //   }
        // });
      },

      function setDefaultValuePresenceSetting(data, callback) {
        presence_setting.findAll().then(res => {
          Promise.all(
            res.map(x => {
              let obj = x.dataValues;
              return obj;
            })
          ).then(arr => {
            // console.log(arr);
            APP.models.company[data.dbName].mysql.presence_setting
              .bulkCreate(arr)
              .then(() => {
                callback(null, data);
              })
              .catch(err => {
                console.log(err);
                callback({
                  code: 'ERR_DATABASE',
                  data: err
                });
              });
          });
        });
      },

      function setDefaultValueBenefit(data, callback) {
        let benefit = APP.models.company[data.dbName].mysql.benefit;
        APP.generateCode(benefit, 'B')
          .then(x => {
            benefit
              .create({
                code: x,
                name: 'Benefit Example',
                description: 'Benefit Example'
              })
              .then(created => {
                data.benefit = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueBenefit', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueBenefit',
                  data: err
                });
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

      function setDefaultValueGrade(data, callback) {
        let grade = APP.models.company[data.dbName].mysql.grade;
        let grade_benefit = APP.models.company[data.dbName].mysql.grade_benefit;
        APP.generateCode(grade, 'G')
          .then(x => {
            grade
              .create({
                code: x,
                name: 'Grade Example',
                description: 'Grade Example'
              })
              .then(created => {
                data.grade = created;

                grade_benefit
                  .create({
                    grade_id: created.id,
                    benefit_id: data.benefit.id,
                    status: 1
                  })
                  .then(() => {
                    callback(null, data);
                  })
                  .catch(err => {
                    console.log('Error grade_benefit setDefaultValueGrade', err);
                    callback({
                      code: 'ERR_DATABASE',
                      message: 'Error setDefaultValueGrade',
                      data: err
                    });
                  });
              })
              .catch(err => {
                console.log('Error grade setDefaultValueGrade', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueGrade',
                  data: err
                });
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

      function setDefaultValueJobTitle(data, callback) {
        let job_title = APP.models.company[data.dbName].mysql.job_title;
        APP.generateCode(job_title, 'JT')
          .then(x => {
            job_title
              .create({
                code: x,
                name: 'Job Title Example',
                description: 'Job Title Example'
              })
              .then(created => {
                data.job_title = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueJobTitle', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueJobTitle',
                  data: err
                });
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

      function setDefaultValueDepartment(data, callback) {
        let department = APP.models.company[data.dbName].mysql.department;
        APP.generateCode(department, 'DEP')
          .then(x => {
            department
              .create({
                code: x,
                name: 'Department Example',
                description: 'Department Example'
              })
              .then(created => {
                data.department = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueDepartment', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueDepartment',
                  data: err
                });
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

      function setDefaultValueStatusContract(data, callback) {
        let status_contract = APP.models.company[data.dbName].mysql.status_contract;
        APP.generateCode(status_contract, 'ES')
          .then(x => {
            status_contract
              .create({
                code: x,
                name: 'Status Contract Example',
                description: 'Status Contract Example'
              })
              .then(created => {
                data.status_contract = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueStatusContract', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueStatusContract',
                  data: err
                });
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

      function setDefaultValueAbsentType(data, callback) {
        let absent_type = APP.models.company[data.dbName].mysql.absent_type;
        APP.generateCode(absent_type, 'AT')
          .then(x => {
            absent_type
              .create({
                code: x,
                name: 'Absent Type Example',
                description: 'Absent Type Example',
                type: 1
              })
              .then(created => {
                data.absent_type = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueAbsentType', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueAbsentType',
                  data: err
                });
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

      function setDefaultValueCutiType(data, callback) {
        let cuti_type = APP.models.company[data.dbName].mysql.cuti_type;
        APP.generateCode(cuti_type, 'CT')
          .then(x => {
            cuti_type
              .create({
                code: x,
                name: 'Cuti Type Example',
                description: 'Cuti Type Example',
                type: 0,
                days: 0
              })
              .then(created => {
                data.cuti_type = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueCutiType', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueCutiType',
                  data: err
                });
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

      function setDefaultValueSchedule(data, callback) {
        let schedule = APP.models.company[data.dbName].mysql.schedule;
        APP.generateCode(schedule, 'S')
          .then(x => {
            schedule
              .create({
                code: x,
                name: 'Shift Type Example',
                description: 'Shift Type Example',
                check_in_start: '07:00:00',
                check_in_end: '15:59:59',
                check_out_start: '16:00:00',
                check_out_end: '23:59:59',
                work_time: '08:00:00',
                break_time: '01:00:00',
                weekly_work_time: '40:00:00',
                work_day: '1,2,3,4,5'
              })
              .then(created => {
                data.schedule = created;

                callback(null, data);
              })
              .catch(err => {
                console.log('Error setDefaultValueSchedule', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error setDefaultValueSchedule',
                  data: err
                });
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

      function setDefaultValuePaymentType(data, callback) {
        let payment_type_active = APP.models.company[data.dbName].mysql.payment_type_active;
        payment_type_active
          .create({
            payment_type_id: 1
          })
          .then(created => {
            data.payment_type_active = created;
            callback(null, data);
          })
          .catch(err => {
            console.log('Error setDefaultValuePaymentType', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error setDefaultValuePaymentType',
              data: err
            });
          });
      },

      function getPricingFeatures(data, callback) {
        pricing.hasMany(pricing_feature, {
          targetKey: 'id',
          foreignKey: 'pricing_id'
        });

        pricing_feature.belongsTo(feature, {
          targetKey: 'id',
          foreignKey: 'feature_id'
        });

        feature.belongsTo(feature_type, {
          targetKey: 'id',
          foreignKey: 'feature_type_id'
        });

        pricing
          .findOne({
            include: [
              {
                model: pricing_feature,
                attributes: ['id', 'feature_id'],
                include: [
                  {
                    model: feature,
                    attributes: ['id', 'name', 'description'],
                    include: [
                      {
                        model: feature_type,
                        attributes: ['id', 'name', 'description']
                      }
                    ]
                  }
                ]
              }
            ],
            where: {
              id: data.data.payment.payment_details[0].item_id
            }
          })
          .then(row => {
            data.pricing = row;
            Promise.all(
              row.pricing_features.map(x => {
                return x.dataValues.feature_id;
              })
            ).then(arr => {
              data.features = arr;
              callback(null, data);
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

      function getSubfeatures(data, callback) {
        subfeature
          .findAll({
            where: {
              feature_id: data.features
            }
          })
          .then(res => {
            Promise.all(
              res.map(x => {
                return x.dataValues.id;
              })
            ).then(arr => {
              data.subfeatures = arr;
              callback(null, data);
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

      function setDefaultValueUserType(data, callback) {
        let { user_type, user_type_feature } = APP.models.company[data.dbName].mysql;
        APP.generateCode(user_type, 'UT')
          .then(x => {
            user_type
              .create({
                code: x,
                name: 'Superadmin',
                description: 'Superadmin'
              })
              .then(created => {
                data.schedule = created;

                Promise.all(
                  data.subfeatures.map(x => {
                    let obj = {
                      subfeature_id: x,
                      user_type_id: created.id
                    };

                    return obj;
                  })
                )
                  .then(arr => {
                    user_type_feature
                      .bulkCreate(arr)
                      .then(res => {
                        data.user_type_features = res;

                        callback(null, {
                          code: 'UPDATE_SUCCESS',
                          id: 'PVP00',
                          message: 'Validasi pembayaran berhasil!',
                          data: {
                            data
                          }
                        });
                      })
                      .catch(err => {
                        console.log('Error user type features setDefaultValueUserType', err);
                        callback({
                          code: 'ERR_DATABASE',
                          data: err
                        });
                      });
                  })
                  .catch(err => {
                    console.log('Error promise setDefaultValueUserType', err);
                    callback({
                      code: 'ERR',
                      data: err
                    });
                  });
              })
              .catch(err => {
                console.log('Error user type setDefaultValueUserType', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error user type setDefaultValueUserType',
                  data: err
                });
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
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    }
  );
};

exports.verifyCompany = (APP, req, callback) => {
  let {
    admin_app,
    payment,
    company,
    admin,
    pricing,
    pricing_feature,
    feature,
    feature_type,
    subfeature,
    payment_method,
    payment_detail,
    presence_setting
  } = APP.models.mysql;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function verifyCredentials(callback) {
          if (req.user.level === 1) {
            admin_app
              .findOne(
                {
                  where: {
                    id: req.user.id
                  }
                },
                { transaction: t }
              )
              .then(res => {
                if (bcrypt.compareSync(req.body.pass, res.password)) {
                  return callback(null, true);
                } else {
                  return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Invalid Password!'
                  });
                }
              })
              .catch(err => {
                console.log('Error function verifyCredentials', err);
                callback({
                  code: 'ERR_DATABASE',
                  message: 'Error function verifyCredentials',
                  data: err
                });
              });
          } else {
            callback({
              code: 'INVALiD_REQUEST',
              message: 'Your account is not super admin'
            });
          }
        },

        function uploadPath(result, callback) {
          try {
            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'ERR',
                id: 'PVS01',
                message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
              });
            }

            APP.fileCheck(req.files.image.data, 'image').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                console.log(res);
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let imagePath = './public/uploads/payment/company/';

                callback(null, {
                  result: result,
                  path: imagePath + fileName + path.extname(req.files.image.name)
                });
              }
            });
          } catch (err) {
            console.log('Error uploadPath', err);
            callback({
              code: 'ERR',
              id: 'PVS01',
              message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi',
              data: err
            });
          }
        },

        function updatePaymentStatus(data, callback) {
          payment
            .findOne(
              {
                where: { invoice: req.body.invoice }
              },
              { transaction: t }
            )
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'NOT_FOUND',
                  message: 'Invoice tidak ditemukan'
                });
              }

              if (res.status === 1) {
                return callback({
                  code: 'UPDATE_NONE',
                  message: 'Payment have already verified!'
                });
              }

              if (res.image === null) {
                return callback({
                  code: 'UPDATE_NONE',
                  message: 'Company have not verify their payment!'
                });
              }

              res
                .update(
                  {
                    status: 0
                    // image_admin: data.path.slice(8),
                    // updated_at: new Date(),
                    // approved_at: new Date(),
                    // approved_by: req.user.id
                  },
                  { transaction: t }
                )
                .then(result => {
                  // Use the mv() method to place the file somewhere on your server
                  req.files.image.mv(data.path, function(err) {
                    if (err) {
                      console.log(err);

                      return callback({
                        code: 'ERR',
                        id: 'PVS01',
                        message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                      });
                    }
                  });
                  callback(null, result.dataValues);
                })
                .catch(err => {
                  console.log('Error function updatePaymentStatus', err);

                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function generateCompanyCode(result, callback) {
          let tgl = new Date().getDate().toString();
          if (tgl.length == 1) {
            tgl = '0' + new Date().getDate().toString();
          }
          let month = new Date().getMonth() + 1;
          let year = new Date()
            .getFullYear()
            .toString()
            .slice(2, 4);
          let time = year + month + tgl;

          company
            .findOne(
              {
                where: {
                  id: result.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              let array = res.name.split(' ');
              let code = '';

              array.map(res => {
                code += res[0].toUpperCase();
              });

              let companyCode = code + time + '0'; // 0 is numbering index
              company
                .findAll(
                  {
                    where: {
                      company_code: {
                        $like: `${code + time}%`
                      }
                    },
                    limit: 1,
                    order: [['id', 'DESC']]
                  },
                  { transaction: t }
                )
                .then(res => {
                  if (res.length == 0) {
                    callback(null, {
                      payment: result,
                      companyCode
                    });
                  } else {
                    let lastID = res[0].company_code;
                    let replace = lastID.replace(code + time, '');
                    let num = parseInt(replace) + 1;

                    companyCode = code + time + num;

                    callback(null, {
                      payment: result,
                      companyCode
                    });
                  }
                })
                .catch(err => {
                  console.log('Error generateCompanyCode', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            });
        },

        function updateCompany(data, callback) {
          company
            .findOne(
              {
                where: {
                  id: data.payment.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              res
                .update(
                  {
                    company_code: data.companyCode,
                    payment_status: 0,
                    status: 0
                  },
                  { transaction: t }
                )
                .then(result => {
                  callback(null, { payment: data.payment, company: result, code: data.companyCode });
                })
                .catch(err => {
                  console.log('Error update updateCompany', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findone updateCompany', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function updateAdmin(data, callback) {
          admin
            .findOne(
              {
                where: {
                  company_id: data.payment.company_id
                }
              },
              { transaction: t }
            )
            .then(res => {
              res
                .update(
                  {
                    // user_type_id: 1,
                    company_code: data.code,
                    status: 0
                  },
                  { transaction: t }
                )
                .then(result => {
                  callback(null, {
                    payment: data.payment,
                    company: data.company,
                    admin: result
                  });
                })
                .catch(err => {
                  console.log('Error update updateAdmin', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'PVQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error findone updateAdmin', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function sendEmail(data, callback) {
          // add payment_method and pricing to payment
          payment.belongsTo(payment_method, {
            targetKey: 'id',
            foreignKey: 'payment_method_id'
          });
          payment_detail.belongsTo(pricing, {
            targetKey: 'id',
            foreignKey: 'item_id'
          });

          payment.hasMany(payment_detail, {
            sourceKey: 'id',
            foreignKey: 'payment_id'
          });

          payment
            .findOne(
              {
                include: [
                  {
                    model: payment_method
                  },
                  {
                    model: payment_detail,
                    include: [
                      {
                        model: pricing
                      }
                    ]
                  }
                ],
                where: {
                  id: data.payment.id
                }
              },
              { transaction: t }
            )
            .then(res => {
              //send to email
              APP.mailer.sendMail({
                subject: 'Company Verified',
                to: data.admin.email,
                data: {
                  payment: res,
                  company: data.company
                },
                file: 'verify_company.html'
              });

              callback(null, {
                payment: res,
                company: data.company
              });
            })
            .catch(err => {
              console.log('Error sendEmail', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'PVQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        },

        function createCompanyDB(data, callback) {
          let dbName = `${process.env.MYSQL_NAME}_${data.company.company_code}`;

          APP.db.sequelize
            .query(`CREATE DATABASE ${dbName}`, { transaction: t })
            .then(() => {
              callback(null, { dbName, data });
            })
            .catch(err => {
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function createTable(data, callback) {
          fs.readdir(path.join(__dirname, '../models/template'), (err, files) => {
            if (err) {
              console.log(err);
              return callback({
                code: 'ERR',
                data: err
              });
            }

            let models = {};
            let x = [];
            let n = 1;
            let len = files.length;

            Promise.all(
              files.map(file => {
                let tableName = file.replace('.js', '');
                x.push(file);
                return APP.db.sequelize
                  .query(`CREATE TABLE ${data.dbName}.${tableName} LIKE ${process.env.MYSQL_NAME}.${tableName}`)
                  .then(() => {
                    x.map(model => {
                      let Model = APP.db
                        .customSequelize(data.dbName)
                        .import(path.join(__dirname, '../models/template/', model));
                      let modelName = model.replace('.js', '');

                      models[modelName] = Model;

                      if (n === len) {
                        let mysqls = {
                          mysql: {}
                        };

                        Object.keys(models).forEach(val => {
                          if (models[val].associate) models[val].associate(models);

                          mysqls.mysql[val] = models[val];
                          APP.models.company[data.dbName] = mysqls;
                        });
                      }

                      n++;
                    });
                  });
              })
            )
              .then(() => {
                callback(null, data);
              })
              .catch(err => {
                console.log(err);
                callback({
                  code: 'ERR',
                  data: err
                });
              });
          });
          // return callback(null, {
          //   code: 'UPDATE_SUCCESS',
          //   id: 'PVP00',
          //   message: 'Validasi pembayaran berhasil!',
          //   data: {
          //     data
          //   }
          // });
        },

        function setDefaultValuePresenceSetting(data, callback) {
          presence_setting.findAll().then(res => {
            Promise.all(
              res.map(x => {
                let obj = x.dataValues;
                return obj;
              })
            ).then(arr => {
              // console.log(arr);
              APP.models.company[data.dbName].mysql.presence_setting
                .bulkCreate(arr)
                .then(() => {
                  callback(null, data);
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            });
          });
        },

        function setDefaultValueBenefit(data, callback) {
          let benefit = APP.models.company[data.dbName].mysql.benefit;
          APP.generateCode(benefit, 'B')
            .then(x => {
              benefit
                .create({
                  code: x,
                  name: 'Benefit Example',
                  description: 'Benefit Example'
                })
                .then(created => {
                  data.benefit = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueBenefit', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueBenefit',
                    data: err
                  });
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

        function setDefaultValueGrade(data, callback) {
          let grade = APP.models.company[data.dbName].mysql.grade;
          let grade_benefit = APP.models.company[data.dbName].mysql.grade_benefit;
          APP.generateCode(grade, 'G')
            .then(x => {
              grade
                .create({
                  code: x,
                  name: 'Grade Example',
                  description: 'Grade Example'
                })
                .then(created => {
                  data.grade = created;

                  grade_benefit
                    .create({
                      grade_id: created.id,
                      benefit_id: data.benefit.id,
                      status: 1
                    })
                    .then(() => {
                      callback(null, data);
                    })
                    .catch(err => {
                      console.log('Error grade_benefit setDefaultValueGrade', err);
                      callback({
                        code: 'ERR_DATABASE',
                        message: 'Error setDefaultValueGrade',
                        data: err
                      });
                    });
                })
                .catch(err => {
                  console.log('Error grade setDefaultValueGrade', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueGrade',
                    data: err
                  });
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

        function setDefaultValueJobTitle(data, callback) {
          let job_title = APP.models.company[data.dbName].mysql.job_title;
          APP.generateCode(job_title, 'JT')
            .then(x => {
              job_title
                .create({
                  code: x,
                  name: 'Job Title Example',
                  description: 'Job Title Example'
                })
                .then(created => {
                  data.job_title = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueJobTitle', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueJobTitle',
                    data: err
                  });
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

        function setDefaultValueDepartment(data, callback) {
          let department = APP.models.company[data.dbName].mysql.department;
          APP.generateCode(department, 'DEP')
            .then(x => {
              department
                .create({
                  code: x,
                  name: 'Department Example',
                  description: 'Department Example'
                })
                .then(created => {
                  data.department = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueDepartment', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueDepartment',
                    data: err
                  });
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

        function setDefaultValueStatusContract(data, callback) {
          let status_contract = APP.models.company[data.dbName].mysql.status_contract;
          APP.generateCode(status_contract, 'ES')
            .then(x => {
              status_contract
                .create({
                  code: x,
                  name: 'Status Contract Example',
                  description: 'Status Contract Example'
                })
                .then(created => {
                  data.status_contract = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueStatusContract', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueStatusContract',
                    data: err
                  });
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

        function setDefaultValueAbsentType(data, callback) {
          let absent_type = APP.models.company[data.dbName].mysql.absent_type;
          APP.generateCode(absent_type, 'AT')
            .then(x => {
              absent_type
                .create({
                  code: x,
                  name: 'Absent Type Example',
                  description: 'Absent Type Example',
                  type: 1
                })
                .then(created => {
                  data.absent_type = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueAbsentType', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueAbsentType',
                    data: err
                  });
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

        function setDefaultValueCutiType(data, callback) {
          let cuti_type = APP.models.company[data.dbName].mysql.cuti_type;
          APP.generateCode(cuti_type, 'CT')
            .then(x => {
              cuti_type
                .create({
                  code: x,
                  name: 'Cuti Type Example',
                  description: 'Cuti Type Example',
                  type: 0,
                  days: 0
                })
                .then(created => {
                  data.cuti_type = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueCutiType', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueCutiType',
                    data: err
                  });
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

        function setDefaultValueSchedule(data, callback) {
          let schedule = APP.models.company[data.dbName].mysql.schedule;
          APP.generateCode(schedule, 'S')
            .then(x => {
              schedule
                .create({
                  code: x,
                  name: 'Shift Type Example',
                  description: 'Shift Type Example',
                  check_in_start: '07:00:00',
                  check_in_end: '15:59:59',
                  check_out_start: '16:00:00',
                  check_out_end: '23:59:59',
                  work_time: '08:00:00',
                  break_time: '01:00:00',
                  weekly_work_time: '40:00:00',
                  work_day: '1,2,3,4,5'
                })
                .then(created => {
                  data.schedule = created;

                  callback(null, data);
                })
                .catch(err => {
                  console.log('Error setDefaultValueSchedule', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error setDefaultValueSchedule',
                    data: err
                  });
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

        function setDefaultValuePaymentType(data, callback) {
          let payment_type_active = APP.models.company[data.dbName].mysql.payment_type_active;
          payment_type_active
            .create({
              payment_type_id: 1
            })
            .then(created => {
              data.payment_type_active = created;
              callback(null, data);
            })
            .catch(err => {
              console.log('Error setDefaultValuePaymentType', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error setDefaultValuePaymentType',
                data: err
              });
            });
        },

        function getPricingFeatures(data, callback) {
          pricing.hasMany(pricing_feature, {
            targetKey: 'id',
            foreignKey: 'pricing_id'
          });

          pricing_feature.belongsTo(feature, {
            targetKey: 'id',
            foreignKey: 'feature_id'
          });

          feature.belongsTo(feature_type, {
            targetKey: 'id',
            foreignKey: 'feature_type_id'
          });

          pricing
            .findOne({
              include: [
                {
                  model: pricing_feature,
                  attributes: ['id', 'feature_id'],
                  include: [
                    {
                      model: feature,
                      attributes: ['id', 'name', 'description'],
                      include: [
                        {
                          model: feature_type,
                          attributes: ['id', 'name', 'description']
                        }
                      ]
                    }
                  ]
                }
              ],
              where: {
                id: data.data.payment.payment_details[0].item_id
              }
            })
            .then(row => {
              data.pricing = row;
              Promise.all(
                row.pricing_features.map(x => {
                  return x.dataValues.feature_id;
                })
              ).then(arr => {
                data.features = arr;
                callback(null, data);
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

        function getSubfeatures(data, callback) {
          subfeature
            .findAll({
              where: {
                feature_id: data.features
              }
            })
            .then(res => {
              Promise.all(
                res.map(x => {
                  return x.dataValues.id;
                })
              ).then(arr => {
                data.subfeatures = arr;
                callback(null, data);
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

        function setDefaultValueUserType(data, callback) {
          let { user_type, user_type_feature } = APP.models.company[data.dbName].mysql;
          APP.generateCode(user_type, 'UT')
            .then(x => {
              user_type
                .create({
                  code: x,
                  name: 'Superadmin',
                  description: 'Superadmin'
                })
                .then(created => {
                  data.schedule = created;

                  Promise.all(
                    data.subfeatures.map(x => {
                      let obj = {
                        subfeature_id: x,
                        user_type_id: created.id
                      };

                      return obj;
                    })
                  )
                    .then(arr => {
                      user_type_feature
                        .bulkCreate(arr)
                        .then(res => {
                          data.user_type_features = res;

                          callback(null, {
                            code: 'UPDATE_SUCCESS',
                            id: 'PVP00',
                            message: 'Validasi pembayaran berhasil!',
                            data: {
                              data
                            }
                          });
                        })
                        .catch(err => {
                          console.log('Error user type features setDefaultValueUserType', err);
                          callback({
                            code: 'ERR_DATABASE',
                            data: err
                          });
                        });
                    })
                    .catch(err => {
                      console.log('Error promise setDefaultValueUserType', err);
                      callback({
                        code: 'ERR',
                        data: err
                      });
                    });
                })
                .catch(err => {
                  console.log('Error user type setDefaultValueUserType', err);
                  callback({
                    code: 'ERR_DATABASE',
                    message: 'Error user type setDefaultValueUserType',
                    data: err
                  });
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
