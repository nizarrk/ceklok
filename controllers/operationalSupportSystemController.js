'use strict';

const async = require('async');
const path = require('path');
const moment = require('moment');
const bcrypt = require('bcrypt');

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
        function checkBody(callback) {
          if (req.body.id) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan Pada Parameter!'
            });
          }
        },

        function checkCompany(data, callback) {
          company
            .findOne(
              {
                where: {
                  id: req.body.id,
                  status: {
                    $not: ['0']
                  }
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

            APP.fileCheck(req.files.upload.tempFilePath, 'all').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let doc = `./public/uploads/company_${data.company_code}/status/`;

                callback(null, {
                  upload: doc + fileName + path.extname(req.files.upload.name),
                  status: data.status,
                  company_code: data.company_code
                });
              }
            });
          } catch (err) {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          }
        },

        function uploadProcess(data, callback) {
          try {
            // upload file
            if (req.files.upload) {
              APP.cdn.uploadCDN(req.files.upload, data.upload).then(res => {
                if (res.error == true) {
                  callback({
                    code: 'ERR',
                    data: res.data
                  });
                } else {
                  callback(null, data);
                }
              });
            } else {
              callback(null, data);
            }
          } catch (err) {
            console.log('Error uploadProcess', err);
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
            .deleteMany({
              company_code: data.company_code
            })
            .then(deleted => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'Re/deactivate company Berhasil!',
                data: {
                  company: data.company,
                  admin: data.admin,
                  token: deleted
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

exports.redeactivateEmployee = (APP, req, callback) => {
  let employee;
  let { token } = APP.models.mongo;

  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkBody(callback) {
          if (req.body.id && req.body.company) {
            employee = APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee;
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan Pada Parameter!'
            });
          }
        },

        function checkEmployee(data, callback) {
          employee
            .findOne({
              where: {
                id: req.body.id,
                status: {
                  $not: ['0']
                }
              }
            })
            .then(res => {
              if (res == null) {
                callback({
                  code: 'NOT_FOUND',
                  message: 'Employee tidak ditemukan!'
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
                message: 'Kesalahan pada parameter upload!'
              });
            }

            APP.fileCheck(req.files.upload.tempFilePath, 'all').then(res => {
              if (res == null) {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'File yang diunggah tidak sesuai!'
                });
              } else {
                let fileName = new Date().toISOString().replace(/:|\./g, '');
                let doc = `./public/uploads/company_${data.company_code}/employee/status/`;

                callback(null, {
                  upload: doc + fileName + path.extname(req.files.upload.name),
                  status: data.status,
                  company_code: data.company_code
                });
              }
            });
          } catch (err) {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          }
        },

        function uploadProcess(data, callback) {
          try {
            // upload file
            if (req.files.upload) {
              APP.cdn.uploadCDN(req.files.upload, data.upload).then(res => {
                if (res.error == true) {
                  callback({
                    code: 'ERR',
                    data: res.data
                  });
                } else {
                  callback(null, data);
                }
              });
            } else {
              callback(null, data);
            }
          } catch (err) {
            console.log('Error uploadProcess', err);
            callback({
              code: 'ERR',
              data: err
            });
          }
        },

        function updateEmployeeStatus(data, callback) {
          console.log(data);

          employee
            .update(
              {
                status: data.status == 1 ? 2 : 1,
                status_upload: data.upload.slice(8) // slice 8 buat hilangin ./public
              },
              {
                where: {
                  id: req.body.id
                }
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

        function destroyAllSessionEmployee(data, callback) {
          token
            .deleteMany({
              company_code: data.company_code,
              level: 3,
              user_id: req.body.id
            })
            .then(deleted => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                message: 'Re/deactivate employee Berhasil!',
                data: {
                  employee: data.updated,
                  token: deleted
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

exports.generateOTP = (APP, req, callback) => {
  let { otp } = APP.models.mongo;
  let query;
  let { level, name, company, subject } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (level && name && company && subject) {
          if (level == 2) {
            query = APP.models.mysql.admin;
            callback(null, true);
          } else if (level == 3) {
            query = APP.models.company[`${process.env.MYSQL_NAME}_${company}`].mysql.employee;
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter level!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function getEmail(data, callback) {
        query
          .findOne({
            where: {
              name: {
                $like: '%' + name + '%'
              },
              company_code: company
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOTE_FOUND',
                message: 'User tidak ditemukan!'
              });
            } else {
              callback(null, res.dataValues);
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

      function createOTP(data, callback) {
        otp
          .findOne({
            email: data.email,
            endpoint: '/operational/sendotp'
          })
          .then(res => {
            if (res == null) {
              otp
                .create({
                  email: data.email,
                  endpoint: req.originalUrl,
                  company: data.company_code,
                  otp: APP.otp.generateOTP(),
                  count: 1,
                  expired_time: moment()
                    .add(1, 'days')
                    .format('YYYY-MM-DD HH:mm:ss'),
                  expired: false,
                  date: req.currentDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(created => {
                  callback(null, created);
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            } else {
              otp
                .findByIdAndUpdate(res._id, {
                  otp: APP.otp.generateOTP(),
                  count: res.count + 1,
                  expired_time: moment()
                    .add(1, 'days')
                    .format('YYYY-MM-DD HH:mm:ss'),
                  expired: false,
                  date: req.currentDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(updated => {
                  callback(null, updated);
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
                  });
                });
            }
          });
      },

      function sendEmail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: subject,
            to: data.email,
            data: {
              otp: data.otp
            },
            file: 'forgot_password.html'
          });

          callback(null, {
            code: 'OK',
            data: data
          });
        } catch (err) {
          console.log(err);
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

exports.forceResetPassword = (APP, req, callback) => {
  let query;
  let { otp, level, company } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (otp && level) {
          if (level == 2) {
            query = APP.models.mysql.admin;
            callback(null, true);
          } else if (level == 3) {
            if (company) {
              query = APP.models.company[`${process.env.MYSQL_NAME}_${company}`].mysql.employee;
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Kesalahan pada parameter company!'
              });
            }
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter level!'
            });
          }
        }
      },

      function checkOTP(data, callback) {
        APP.models.mongo.otp
          .findOne({
            otp: otp,
            expired: false
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'OTP tidak ditemukan!'
              });
            } else {
              // if waktu sekarang kurang dari sama dengan waktu expired
              if (new Date().getTime() <= new Date(res.expired_time).getTime()) {
                res
                  .updateOne({
                    expired: true
                  })
                  .then(() => {
                    callback(null, res);
                  })
                  .catch(err => {
                    console.log(err);
                    callback({
                      code: 'ERR_DATABASE',
                      data: err
                    });
                  });
              } else {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'OTP Expired! Silahkan mengujakn kode OTP baru!'
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

      function encryptPassword(data, callback) {
        let randomPass = Math.random()
          .toString(36)
          .slice(-8);
        // let pass = APP.validation.password(randomPass);
        bcrypt
          .hash(randomPass, 10)
          .then(hashed => {
            return callback(null, {
              data: data,
              pass: randomPass,
              encryptedPass: hashed
            });
          })
          .catch(err => {
            console.log('iki error bcrypt', err);

            callback({
              code: 'ERR',
              id: '',
              message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function updatePassword(data, callback) {
        query
          .update(
            {
              password: data.encryptedPass
            },
            {
              where: {
                email: data.data.email
              }
            }
          )
          .then(updated => {
            callback(null, {
              updated: updated,
              data: data.data,
              pass: data.pass,
              encryptedPass: data.encryptedPass
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

      function sendEmail(data, callback) {
        try {
          APP.mailer.sendMail({
            subject: 'Force Reset Password',
            to: data.data.email,
            data: {
              pass: data.pass
            },
            file: 'reset_password.html'
          });

          callback(null, {
            code: 'UPDATE_SUCCESS',
            message: 'Force Reset Password Berhasil!',
            data: data.updated
          });
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
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

exports.resetFailedAttempt = (APP, req, callback) => {
  let { otp, type, name, company, level } = req.body;
  let query;
  let query2;
  async.waterfall(
    [
      function checkBody(callback) {
        if (level == 1) {
          if (otp && type && name) {
            query = APP.models.mysql.admin_app;
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        } else if (level == 2) {
          if (otp && type && name && company) {
            query = APP.models.mysql.admin;
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        } else if (level == 3) {
          if (otp && type && name && company) {
            query = APP.models.company[`${process.env.MYSQL_NAME}_${company}`].mysql.employee;
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter level!'
          });
        }
      },

      function checkOTP(data, callback) {
        APP.models.mongo.otp
          .findOne({
            otp: otp,
            expired: false
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'OTP tidak ditemukan!'
              });
            } else {
              // if waktu sekarang kurang dari sama dengan waktu expired
              if (new Date().getTime() <= new Date(res.expired_time).getTime()) {
                res
                  .updateOne({
                    expired: true
                  })
                  .then(() => {
                    callback(null, res);
                  })
                  .catch(err => {
                    console.log(err);
                    callback({
                      code: 'ERR_DATABASE',
                      data: err
                    });
                  });
              } else {
                callback({
                  code: 'INVALID_REQUEST',
                  message: 'OTP Expired! Silahkan mengujakn kode OTP baru!'
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

      function resetAttempt(data, callback) {
        if (type == 1) {
          query
            .update(
              {
                login_attempt: 0
              },
              {
                where: {
                  email: data.email
                }
              }
            )
            .then(updated => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                data: updated
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        } else if (type == 2) {
          APP.models.mongo.otp
            .updateOne(
              {
                email: data.email,
                endpoint: '/auth/forgotpassword'
              },
              {
                count: 0
              }
            )
            .then(updated => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                data: updated
              });
            });
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter type!'
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

exports.listKnowledge = (APP, req, callback) => {
  let { knowledge, feature, subfeature } = APP.models.mysql;

  knowledge.belongsTo(feature, {
    targetKey: 'id',
    foreignKey: 'feature_id'
  });

  knowledge.belongsTo(subfeature, {
    targetKey: 'id',
    foreignKey: 'subfeature_id'
  });

  knowledge
    .findAll({
      include: [
        {
          model: feature,
          attributes: ['id', 'name', 'description']
        },
        {
          model: subfeature,
          attributes: ['id', 'name', 'description']
        }
      ],
      where: {
        status: 1
      }
    })
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          id: 'KNQ00',
          message: 'Knowledge tidak ditemukan!'
        });
      } else {
        Promise.all(
          res.map(x => {
            x.dataValues.feature_type_name = x.feature_type == 1 ? 'Feature' : 'Support / Non Feature';
            x.dataValues.error_level_status =
              x.error_level == 1 ? 'Low' : x.error_level == 2 ? 'Medium' : x.error_level == 3 ? 'High' : '';

            return true;
          })
        ).then(() => {
          callback(null, {
            code: 'FOUND',
            id: 'KNQ00',
            data: res
          });
        });
      }
    });
};

exports.addKnowledge = (APP, req, callback) => {
  let { knowledge, feature, subfeature } = APP.models.mysql;
  let { feature_id, subfeature_id, type, name, desc, condition, analysis, solution, error } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (type == 1) {
          if (feature_id && subfeature_id && type && name && desc && condition && analysis && solution && error) {
            callback(null, {
              name: name,
              date: new Date(),
              feature_type: type,
              feature_id: feature_id,
              subfeature_id: subfeature_id,
              description: desc,
              condition: condition,
              analysis: analysis,
              solution: solution,
              created_by: req.user.id,
              error_level: error
            });
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'KNQ96',
              message: 'Kesalahan pada parameter!'
            });
          }
        } else if (type == 2) {
          if (type && name && desc && condition && analysis && solution && error) {
            callback(null, {
              name: name,
              date: new Date(),
              feature_type: type,
              description: desc,
              condition: condition,
              analysis: analysis,
              solution: solution,
              created_by: req.user.id,
              error_level: error
            });
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'KNQ96',
              message: 'Kesalahan pada parameter!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'KNQ96',
            message: 'Kesalahan pada parameter type!'
          });
        }
      },

      function checkFeature(data, callback) {
        if (type == 1) {
          feature
            .findAll({
              attributes: ['id'],
              where: {
                id: feature_id
              }
            })
            .then(res => {
              if (res.length == 0) {
                callback({
                  code: 'NOT_FOUND',
                  id: 'KNQ96',
                  message: 'Feature tidak ditemukan!'
                });
              } else {
                callback(null, data);
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
          callback(null, data);
        }
      },

      function checkSubfeature(data, callback) {
        if (type == 1) {
          subfeature
            .findAll({
              attributes: ['id'],
              where: {
                id: subfeature_id
              }
            })
            .then(res => {
              if (res.length == 0) {
                callback({
                  code: 'NOT_FOUND',
                  id: 'KNQ96',
                  message: 'Feature tidak ditemukan!'
                });
              } else {
                callback(null, data);
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
          callback(null, data);
        }
      },

      function insertKnowledge(data, callback) {
        knowledge
          .create(data)
          .then(created => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'KNQ00',
              data: created
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

exports.editKnowledge = (APP, req, callback) => {
  let { knowledge } = APP.models.mysql;
  let { id, name, desc, condition, analysis, solution, error } = req.body;

  async.waterfall(
    [
      function checkBody(callback) {
        if (id && name && desc && condition && analysis && solution && error) {
          if (error == 1 || error == 2 || error == 3) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'KNQ96',
              message: 'Kesalahan pada parameter error level!'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'KNQ96',
            message: 'Kesalahan pada parameter!'
          });
        }
      },

      function updateKnowledge(data, callback) {
        knowledge
          .update(
            {
              name: name,
              condition: condition,
              analysis: analysis,
              solution: solution,
              error_level: error,
              updated_at: new Date(),
              updated_by: req.user.id
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(updated => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'KNQ00',
              data: updated
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

exports.deleteKnowledge = (APP, req, callback) => {
  let { knowledge } = APP.models.mysql;

  if (!req.body.id) {
    callback({
      code: 'INVALID_REQUEST',
      message: 'Kesalahan pada parameter!'
    });
  } else {
    knowledge
      .update(
        {
          status: 0,
          updated_at: new Date(),
          updated_by: req.user.id
        },
        {
          where: {
            id: req.body.id
          }
        }
      )
      .then(updated => {
        callback(null, {
          code: 'UPDATE_SUCCESS',
          id: 'KNQ00',
          data: updated
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
};

exports.listSentEmail = (APP, req, callback) => {
  let { _logs_email } = APP.models.mongo;

  _logs_email
    .find()
    .then(res => {
      if (res.length == 0) {
        callback({
          code: 'NOT_FOUND',
          message: 'List Email tidak ditemukan!'
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

exports.resendEmail = (APP, req, callback) => {
  let { _logs_email } = APP.models.mongo;
  let { id } = req.body;
  async.waterfall(
    [
      function checkBody(callback) {
        if (id) {
          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
          });
        }
      },

      function getDetailsEmail(data, callback) {
        _logs_email
          .findOne({
            _id: id
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'List Email tidak ditemukan!'
              });
            } else {
              callback(null, JSON.parse(res.data));
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

      function resendMail(data, callback) {
        try {
          APP.mailer.sendMail(data);
          callback(null, {
            code: 'OK',
            message: 'Berhasil mengirim ulang email!',
            data: data
          });
        } catch (err) {
          console.log(err);
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
