'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
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
          data: {
            row: 'Error! Duplicate email!'
          },
          info: {
            dataCount: res.length,
            parameter: 'email company'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'email company'
        }
      });
    })
    .catch(err => {
      console.log('iki error email company', err);
      return callback({
        code: 'ERR_DATABASE',
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
          data: {
            row: 'Error! Duplicate telp!'
          },
          info: {
            dataCount: res.length,
            parameter: 'telp company'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'telp company'
        }
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
          data: {
            row: 'Error! Duplicate email!'
          },
          info: {
            dataCount: res.length,
            parameter: 'email admin'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'email admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error email admin', err);
      return callback({
        code: 'ERR_DATABASE',
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
          data: {
            row: 'Error! Duplicate telp!'
          },
          info: {
            dataCount: res.length,
            parameter: 'telp admin'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'telp admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error telp admin', err);
      callback({
        code: 'ERR_DATABASE',
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
          data: {
            row: 'Error! Duplicate username!'
          },
          info: {
            dataCount: res.length,
            parameter: 'username admin'
          }
        });
      }
      return callback(null, {
        code: 'NOT_FOUND',
        data: null,
        info: {
          dataCount: res.length,
          parameter: 'username admin'
        }
      });
    })
    .catch(err => {
      console.log('iki error username', err);
      return callback({
        code: 'ERR_DATABASE',
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
                code: 'ERR_DATABASE',
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
              password: data.pass
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
              });
          })
          .catch(err => {
            console.log('2', err);
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
            console.log(res.image);
            if (res.image == null) {
              return callback(null, true);
            } else {
              callback({
                code: 'ERR',
                message: 'Already Paid!'
              });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR_DATABASE',
              data: JSON.stringify(err)
            });
          });
      },

      function uploadBukti(result, callback) {
        if (!req.files || Object.keys(req.files).length === 0) {
          return callback({
            code: 'ERR',
            message: 'No files were uploaded.'
          });
        }

        let fileName = '';
        let path = '/uploads/';
        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let image = req.files.image;
        if (image.mimetype === 'image/jpeg') {
          fileName = new Date().toISOString().replace(/:|\./g, '') + '.jpeg';
        } else if (image.mimetype === 'image/png') {
          fileName = new Date().toISOString().replace(/:|\./g, '') + '.png';
        }

        // Use the mv() method to place the file somewhere on your server
        image.mv('.' + path + fileName, function(err) {
          if (err)
            return callback({
              code: 'ERR'
            });

          callback(null, path + fileName);
        });
      },

      function updatePaymentDetails(result, callback) {
        APP.models.mysql.payment
          .update(
            {
              from_bank_name: req.body.bank,
              from_rek_name: req.body.name,
              from_rek_no: req.body.no,
              image: result
            },
            {
              where: {
                invoice: req.body.invoice
              }
            }
          )
          .then(res => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              data: res
            });
          })
          .catch(err => {
            console.log(err);

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
                code: 'VERIFICATION_NEEDED',
                info: {
                  parameter: 'User have to wait for admin to verify their account first.'
                }
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
            db: `ceklok_${rows[0].company_code}`
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_admin: rows[0].id,
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
  // add role, grade, department and job_title to employee
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
        }
      ],
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
          status: req.body.status
        })
        .then(result => {
          //send to email
          APP.mailer.sendMail({
            subject: 'Account Verified',
            to: req.body.email,
            data: {
              role: res.role.name,
              grade: res.grade.name,
              department: res.department.name,
              job: res.job_title.name
            },
            file: 'verify_employee.html'
          });
          callback(null, {
            code: 'UPDATE_SUCCESS',
            data: result
          });
        })
        .catch(err => {
          console.log(err);

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
};

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
              return callback(null, {
                code: 'INSERT_SUCCESS',
                data: result.dataValues || params
              });
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
