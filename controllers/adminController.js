'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const dbName = 'ceklok_VST1912090';

exports.checkExistingEmailCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        email: req.body.company.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          id: 'ARP01',
          message: 'Email Company sudah pernah terdaftar, gunakan email yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Email Company tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error email company', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpCompany = (APP, req, callback) => {
  APP.models.mysql.company
    .findAll({
      where: {
        tlp: req.body.company.telp
      }
    })
    .then(res => {
      console.log(res);

      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          id: 'ARP01',
          message: 'Telp Company sudah pernah terdaftar, gunakan Telp yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Telp Company tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error telp company', err);
      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingEmailAdmin = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        email: req.body.admin.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          id: 'ARP01',
          message: 'Email Admin sudah pernah terdaftar, gunakan email yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Email Admin Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error email admin', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingTelpAdmin = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        tlp: req.body.admin.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          id: 'ARP01',
          message: 'Telp Admin sudah pernah terdaftar, gunakan Telp yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Telp Admin Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error telp admin', err);
      callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingUsername = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        user_name: req.body.admin.username
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        return callback({
          code: 'DUPLICATE',
          id: 'ARP01',
          message: 'Username sudah pernah terdaftar, gunakan username yang lain'
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        id: 'ARQ97',
        message: 'Data Username Tidak ditemukan'
      });
    })
    .catch(err => {
      console.log('iki error username', err);
      return callback({
        code: 'ERR_DATABASE',
        id: 'ARQ98',
        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
        data: JSON.stringify(err)
      });
    });
};

exports.checkExistingCredentialsCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function checkTelp(callback) {
        module.exports.checkExistingTelpCompany(APP, req, callback);
      },

      function checkEmail(result, callback) {
        module.exports.checkExistingEmailCompany(APP, req, callback);
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.checkExistingCredentialsAdmin = (APP, req, callback) => {
  async.waterfall(
    [
      function checkUsername(callback) {
        module.exports.checkExistingUsername(APP, req, callback);
      },

      function checkTelp(result, callback) {
        module.exports.checkExistingTelpAdmin(APP, req, callback);
      },

      function checkEmail(result, callback) {
        module.exports.checkExistingEmailAdmin(APP, req, callback);
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.register = (APP, req, callback) => {
  async.waterfall(
    [
      function checkCredentialsAdmin(callback) {
        module.exports.checkExistingCredentialsAdmin(APP, req, callback);
      },

      function checkCredentialsCompany(result, callback) {
        module.exports.checkExistingCredentialsCompany(APP, req, callback);
      },

      function encryptPassword(result, callback) {
        let pass = APP.validation.password(req.body.admin.pass);
        if (pass === true) {
          bcrypt
            .hash(req.body.admin.pass, 10)
            .then(hashed => {
              return callback(null, hashed);
            })
            .catch(err => {
              console.log('iki error bcrypt', err);

              callback({
                code: 'ERR',
                id: 'ARN99',
                message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
                data: JSON.stringify(err)
              });
            });
        } else {
          return callback(pass);
        }
      },

      function registerCompany(result, callback) {
        APP.models.mysql.company
          .build({
            pricing_id: req.body.company.pricing,
            name: req.body.company.name,
            address: req.body.company.address,
            kelurahan: req.body.company.kel,
            kecamatan: req.body.company.kec,
            city: req.body.company.city,
            province: req.body.company.prov,
            zipcode: req.body.company.zip,
            msisdn: 'default',
            tlp: req.body.company.telp,
            email: req.body.company.email,
            payment_status: 0
          })
          .save()
          .then(res => {
            callback(null, {
              pass: result,
              company: res
            });
          })
          .catch(err => {
            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                id: 'ARQ96',
                message: 'Kesalahan pada parameter',
                info: {
                  parameter: params
                }
              });
            }

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                id: 'ARQ96',
                message: 'Kesalahan pada parameter',
                info: {
                  parameter: params
                }
              });
            }

            return callback({
              code: 'ERR_DATABASE',
              id: 'ARQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: JSON.stringify(err)
            });
          });
      },

      function registerAdmin(data, callback) {
        let email = APP.validation.email(req.body.admin.email);
        let username = APP.validation.username(req.body.admin.username);

        if (email && username) {
          APP.models.mysql.admin
            .build({
              company_id: data.company.id,
              name: req.body.admin.name,
              gender: req.body.admin.gender,
              pob: req.body.admin.pob,
              dob: req.body.admin.dob,
              address: req.body.admin.address,
              kelurahan: req.body.admin.kel,
              kecamatan: req.body.admin.kec,
              city: req.body.admin.city,
              province: req.body.admin.prov,
              zipcode: req.body.admin.zip,
              msisdn: 'default',
              tlp: req.body.admin.telp,
              email: req.body.admin.email,
              user_name: req.body.admin.username,
              password: data.pass,
              old_password: data.pass
            })
            .save()
            .then(res => {
              callback(null, {
                admin: res,
                company: data.company
              });
            })
            .catch(err => {
              if (err.original && err.original.code === 'ER_DUP_ENTRY') {
                let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
                return callback({
                  code: 'DUPLICATE',
                  id: 'ARQ96',
                  message: 'Kesalahan pada parameter',
                  info: {
                    parameter: params
                  }
                });
              }

              if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
                let params = 'Error! Empty Query'; //This is only example, Object can also be used
                return callback({
                  code: 'UPDATE_NONE',
                  id: 'ARQ96',
                  message: 'Kesalahan pada parameter',
                  info: {
                    parameter: params
                  }
                });
              }

              return callback({
                code: 'ERR_DATABASE',
                id: 'ARQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: JSON.stringify(err)
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function paymentUser(data, callback) {
        APP.models.mysql.payment
          .create({
            payment_method_id: req.body.payment.method,
            pricing_id: req.body.payment.pricing,
            invoice: new Date().getTime(),
            company_id: data.company.id,
            total: req.body.payment.total,
            status: 0
          })
          .then(res => {
            callback(null, {
              admin: data.admin.dataValues,
              company: data.company.dataValues,
              payment: res.dataValues
            });
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              id: 'ARQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: JSON.stringify(err)
            });
          });
      },

      function getPaymentInfo(data, callback) {
        // add payment_method to payment
        APP.models.mysql.payment.belongsTo(APP.models.mysql.payment_method, {
          targetKey: 'id',
          foreignKey: 'payment_method_id'
        });
        // add pricing to payment
        APP.models.mysql.payment.belongsTo(APP.models.mysql.pricing, {
          targetKey: 'id',
          foreignKey: 'pricing_id'
        });
        // add payment_type to payment_method
        APP.models.mysql.payment_method.belongsTo(APP.models.mysql.payment_type, {
          targetKey: 'id',
          foreignKey: 'payment_type_id'
        });

        APP.models.mysql.payment
          .findOne({
            include: [
              {
                model: APP.models.mysql.payment_method
              },
              {
                model: APP.models.mysql.pricing
              }
            ],
            where: {
              id: data.payment.id
            }
          })
          .then(res => {
            APP.models.mysql.payment_method
              .findOne({
                include: [
                  {
                    model: APP.models.mysql.payment_type
                  }
                ],
                where: {
                  id: res.payment_method_id
                }
              })
              .then(result => {
                // include payment type to res
                res.payment_method.dataValues.payment_type = result.payment_type;
                callback(null, {
                  admin: data.admin,
                  company: data.company,
                  paymentInfo: res
                });
              })
              .catch(err => {
                console.log('1', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'ARQ98',
                  message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                  data: JSON.stringify(err)
                });
              });
          })
          .catch(err => {
            console.log('2', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'ARQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: JSON.stringify(err)
            });
          });
      },

      function createInvoice(data, callback) {
        console.log(data);
        APP.models.mysql.invoice
          .create({
            payment_id: data.paymentInfo.id,
            invoice: data.paymentInfo.invoice,
            name: "Company's Invoice",
            description: 'Invoice of Pricing that choosed by company',
            to_rek_name: data.paymentInfo.payment_method.to_rek_name,
            to_rek_no: data.paymentInfo.payment_method.to_rek_no
          })
          .then(res => {
            callback(null, {
              payment: data.paymentInfo,
              company: data.company,
              admin: data.admin,
              invoice: res
            });
          })
          .catch(err => {
            console.log('3', err);

            callback({
              code: 'ERR_DATABASE',
              id: 'ARQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: JSON.stringify(err)
            });
          });
      },

      function sendInvoice(data, callback) {
        //send to email
        APP.mailer.sendMail({
          subject: 'Invoice',
          to: data.company.email,
          data: {
            payment: data.payment,
            company: data.company,
            invoice: data.invoice
          },
          file: 'invoice.html'
        });

        callback(null, {
          code: 'INSERT_SUCCESS',
          id: 'ARP00',
          message: 'Registrasi Sukses!',
          data: data
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.paymentCompany = (APP, req, callback) => {
  async.waterfall(
    [
      function checkPaymentStatus(callback) {
        APP.models.mysql.payment
          .findOne({
            where: {
              invoice: req.body.invoice
            }
          })
          .then(res => {
            if (res == null) {
              return callback({
                code: 'NOT_FOUND',
                id: 'PVP01',
                message: 'Invoice tidak ditemukan, mohon periksa kembali nomor invoice anda.'
              });
            }

            if (res.image == null) {
              return callback(null, true);
            } else {
              callback({
                code: 'ERR',
                id: 'PVP03',
                message: 'Terjadi kesalahan, mohon ulangi kembali.'
              });
            }
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: JSON.stringify(err)
            });
          });
      },

      function uploadPath(result, callback) {
        if (!req.files || Object.keys(req.files).length === 0) {
          return callback({
            code: 'ERR',
            id: 'PVS01',
            message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
          });
        }

        let fileName = new Date().toISOString().replace(/:|\./g, '');
        let imagePath = './public/uploads/payment/company/';

        if (!fs.existsSync(imagePath)) {
          mkdirp.sync(imagePath);
        }

        callback(null, imagePath + fileName + path.extname(req.files.image.name));
      },

      function updatePaymentDetails(result, callback) {
        APP.models.mysql.payment
          .update(
            {
              from_bank_name: req.body.bank,
              from_rek_name: req.body.name,
              from_rek_no: req.body.no,
              image: result.slice(8)
            },
            {
              where: {
                invoice: req.body.invoice
              }
            }
          )
          .then(res => {
            // Use the mv() method to place the file somewhere on your server
            req.files.image.mv(result, function(err) {
              if (err) {
                console.log(err);

                return callback({
                  code: 'ERR',
                  id: 'PVS01',
                  message: 'Mohon maaf terjadi kesalahan, pilih gambar sekali lagi'
                });
              }
            });

            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'PVP00',
              message: 'Verifikasi pembayaran diterima!',
              data: res
            });
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              id: 'PVQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.login = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        if (!req.body.username)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'username'
            }
          });

        if (!req.body.pass)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'password'
            }
          });

        if (!req.body.platform)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'platform'
            }
          });

        if (req.body.platform != 'Web')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            info: {
              invalidParameter: 'platform'
            }
          });

        callback(null, true);
      },

      function checkAdmin(index, callback) {
        APP.models.mysql.admin
          .findAll({
            where: {
              user_name: req.body.username
            }
          })
          .then(rows => {
            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                info: {
                  parameter: 'No records found'
                }
              });
            }

            if (rows[0].status == 0) {
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Company have to wait for admin to verify their account first!'
              });
            }
            callback(null, rows);
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function commparePassword(rows, callback) {
        bcrypt
          .compare(req.body.pass, rows[0].password)
          .then(res => {
            if (res === true) return callback(null, rows);

            callback({
              code: 'INVALID_PASSWORD',
              info: {
                parameter: 'password did not match'
              }
            });
          })
          .catch(err => {
            callback({
              code: 'ERR_BCRYPT',
              data: JSON.stringify(err)
            });
          });
      },

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows[0].id,
            code: rows[0].company_code,
            db: `ceklok_${rows[0].company_code}`,
            admin: true
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_admin: rows[0].id,
            company_code: rows[0].company_code,
            platform: req.body.platform
          })
          .then(res => {
            if (res !== null) {
              console.log('iki update');

              APP.models.mongo.token
                .findByIdAndUpdate(res._id, {
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(res => {
                  return callback(null, {
                    code: 'UPDATE_SUCCESS',
                    data: {
                      row: rows[0].dataValues,
                      token
                    },
                    info: {
                      dataCount: rows.length
                    }
                  });
                })
                .catch(err => {
                  return callback({
                    code: 'ERR_DATABASE',
                    data: JSON.stringify(err)
                  });
                });
            } else {
              console.log('iki insert');

              APP.models.mongo.token
                .create({
                  id_admin: rows[0].id,
                  platform: req.body.platform,
                  token,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(result => {
                  return callback(null, {
                    code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                    data: {
                      row: rows[0],
                      token
                    },
                    info: {
                      dataCount: rows.length
                    }
                  });
                })
                .catch(err => {
                  return callback({
                    code: 'ERR_DATABASE',
                    data: JSON.stringify(err)
                  });
                });
            }
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
  async.waterfall(
    [
      function updateEmployeeInfo(callback) {
        APP.models.company[req.user.db].mysql.employee
          .findOne({
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            if (res.status == 1) {
              return callback({
                code: 'UPDATE_NONE'
              });
            }
            res
              .update({
                role_id: req.body.role,
                grade_id: req.body.grade,
                department_id: req.body.department,
                job_title_id: req.body.job,
                status: req.body.status,
                status_contract_id: req.body.contract
              })
              .then(result => {
                callback(null, result);
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

      function sendEmail(result, callback) {
        // add role, grade, department, job_title and status_contract to employee
        APP.models.company[req.user.db].mysql.employee.belongsTo(APP.models.company[req.user.db].mysql.role, {
          targetKey: 'id',
          foreignKey: 'role_id'
        });
        APP.models.company[req.user.db].mysql.employee.belongsTo(APP.models.company[req.user.db].mysql.grade, {
          targetKey: 'id',
          foreignKey: 'grade_id'
        });
        APP.models.company[req.user.db].mysql.employee.belongsTo(APP.models.company[req.user.db].mysql.department, {
          targetKey: 'id',
          foreignKey: 'department_id'
        });
        APP.models.company[req.user.db].mysql.employee.belongsTo(APP.models.company[req.user.db].mysql.job_title, {
          targetKey: 'id',
          foreignKey: 'job_title_id'
        });
        APP.models.company[req.user.db].mysql.employee.belongsTo(
          APP.models.company[req.user.db].mysql.status_contract,
          {
            targetKey: 'id',
            foreignKey: 'status_contract_id'
          }
        );

        APP.models.company[req.user.db].mysql.employee
          .findOne({
            include: [
              {
                model: APP.models.company[req.user.db].mysql.role
              },
              {
                model: APP.models.company[req.user.db].mysql.grade
              },
              {
                model: APP.models.company[req.user.db].mysql.department
              },
              {
                model: APP.models.company[req.user.db].mysql.job_title
              },
              {
                model: APP.models.company[req.user.db].mysql.status_contract
              }
            ],
            where: {
              email: req.body.email
            }
          })
          .then(res => {
            //send to email
            APP.mailer.sendMail({
              subject: 'Account Verified',
              to: req.body.email,
              data: {
                role: res.role.name,
                grade: res.grade.name,
                department: res.department.name,
                job: res.job_title.name,
                contract: res.status_contract.name
              },
              file: 'verify_employee.html'
            });

            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log('3', err);

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

exports.editStatusContractEmployee = (APP, req, callback) => {
  APP.models.company[req.user.db].mysql.job_title
    .update(
      {
        name: req.body.name,
        description: req.body.desc
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      if (!result || (result && !result[0])) {
        let params = 'No data updated'; //This is only example, Object can also be used
        return callback(null, {
          code: 'UPDATE_NONE',
          data: params
        });
      }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        data: params
      });
    })
    .catch(err => {
      console.log('iki error', err);

      if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
        let params = 'Error! Empty Query'; //This is only example, Object can also be used
        return callback({
          code: 'UPDATE_NONE',
          data: params
        });
      }

      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
        return callback({
          code: 'DUPLICATE',
          data: params
        });
      }

      return callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};
