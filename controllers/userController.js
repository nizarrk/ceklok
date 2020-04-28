'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const path = require('path');
const trycatch = require('trycatch');

exports.checkExistingCredentialsAdmin = (APP, req, callback) => {
  async.waterfall(
    [
      function checkEmail(callback) {
        APP.models.mysql.admin
          .findAll({
            where: {
              email: req.body.email
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
              data: err
            });
          });
      },

      function checkTelp(result, callback) {
        APP.models.mysql.admin
          .findAll({
            where: {
              tlp: req.body.telp
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
              data: err
            });
          });
      },

      function checkUsername(result, callback) {
        APP.models.mysql.admin
          .findAll({
            where: {
              user_name: req.body.username
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

exports.checkExistingCredentialsAdminCeklok = (APP, req, callback) => {
  async.waterfall(
    [
      function checkEmail(callback) {
        APP.models.mysql.admin_app
          .findAll({
            where: {
              email: req.body.email
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
              data: err
            });
          });
      },

      function checkUsername(result, callback) {
        APP.models.mysql.admin_app
          .findAll({
            where: {
              user_name: req.body.username
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

exports.createUserAdmin = (APP, req, callback) => {
  async.waterfall(
    [
      function checkCredentialsAdmin(callback) {
        module.exports.checkExistingCredentialsAdmin(APP, req, callback);
      },

      function encryptPassword(result, callback) {
        let randomPass = Math.random()
          .toString(36)
          .slice(-8);
        // let pass = APP.validation.password(randomPass);
        bcrypt
          .hash(randomPass, 10)
          .then(hashed => {
            return callback(null, {
              pass: randomPass,
              encryptedPass: hashed
            });
          })
          .catch(err => {
            console.log('iki error bcrypt', err);

            callback({
              code: 'ERR',
              id: 'ARN99',
              message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function addingNewUser(data, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email && username) {
          APP.models.mysql.admin
            .build({
              company_id: req.user.company,
              company_code: req.user.code,
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
              old_password: data.encryptedPass,
              status: 1
            })
            .save()
            .then(res => {
              callback(null, {
                pass: data.pass,
                inserted: res
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
                data: err
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function sendInvoice(data, callback) {
        //send to email
        APP.mailer.sendMail({
          subject: 'Account Created',
          to: req.body.email,
          data: {
            username: data.inserted.user_name,
            pass: data.pass
          },
          file: 'create_employee.html'
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

exports.createUserAdminCeklok = (APP, req, callback) => {
  async.waterfall(
    [
      function checkCredentialsAdmin(callback) {
        module.exports.checkExistingCredentialsAdminCeklok(APP, req, callback);
      },

      function encryptPassword(result, callback) {
        let randomPass = Math.random()
          .toString(36)
          .slice(-8);
        let pass = APP.validation.password(randomPass);
        if (pass === true) {
          bcrypt
            .hash(randomPass, 10)
            .then(hashed => {
              return callback(null, {
                pass: randomPass,
                encryptedPass: hashed
              });
            })
            .catch(err => {
              console.log('iki error bcrypt', err);

              callback({
                code: 'ERR',
                id: 'ARN99',
                message: 'Jaringan bermasalah harap coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        } else {
          return callback(pass);
        }
      },

      function addingNewUser(data, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email && username) {
          APP.models.mysql.admin_app
            .build({
              name: req.body.name,
              email: req.body.email,
              user_name: req.body.username,
              password: data.encryptedPass,
              old_password: data.encryptedPass
            })
            .save()
            .then(res => {
              callback(null, {
                pass: data.pass,
                inserted: res
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
                data: err
              });
            });
        } else {
          if (email !== true) return callback(email);
          if (username !== true) return callback(username);
        }
      },

      function sendMail(data, callback) {
        //send to email
        APP.mailer.sendMail({
          subject: 'Account Created',
          to: req.body.email,
          data: {
            username: data.inserted.user_name,
            pass: data.pass
          },
          file: 'create_employee.html'
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

exports.getAllListUser = (APP, req, callback) => {
  let mysql = APP.models.mysql;

  if (req.user.level === 2) {
    mysql.admin
      .findAll({
        where: {
          company_id: req.user.company
        }
      })
      .then(res => {
        if (res.length == 0) {
          return callback({
            code: 'NOT_FOUND',
            message: 'List user tidak ditemukan pada company'
          });
        }
        callback(null, {
          code: 'FOUND',
          data: res
        });
      })
      .catch(err => {
        console.log('Error list admin company', err);
        callback({
          code: 'ERR_DATABASE',
          message: 'Error list user company',
          data: err
        });
      });
  } else if (req.user.level === 1) {
    mysql.admin_app
      .findAll()
      .then(res => {
        if (res.length == 0) {
          return callback({
            code: 'NOT_FOUND',
            message: 'List user tidak ditemukan pada CEKLOK'
          });
        }
        callback(null, {
          code: 'FOUND',
          data: res
        });
      })
      .catch(err => {
        console.log('Error list admin ceklok', err);
        callback({
          code: 'ERR_DATABASE',
          message: 'Error list user ceklok',
          data: err
        });
      });
  } else {
    return callback({
      code: 'INVALID_REQUEST',
      message: 'Anda tidak bisa mengaksses fitur ini'
    });
  }
};

exports.getDetailsUser = (APP, req, callback) => {
  let mysql = APP.models.mysql;

  if (req.user.level === 2) {
    mysql.admin
      .findOne({
        where: {
          company_id: req.user.company,
          id: req.body.id
        }
      })
      .then(res => {
        if (res == null) {
          return callback({
            code: 'NOT_FOUND',
            message: 'User tidak ditemukan pada company'
          });
        }
        callback(null, {
          code: 'FOUND',
          data: res
        });
      })
      .catch(err => {
        console.log('Error Udmin company', err);
        callback({
          code: 'ERR_DATABASE',
          message: 'Error User company',
          data: err
        });
      });
  } else if (req.user.level === 1) {
    mysql.admin_app
      .findOne({
        where: {
          id: req.body.id
        }
      })
      .then(res => {
        if (res == null) {
          return callback({
            code: 'NOT_FOUND',
            message: 'User tidak ditemukan pada CEKLOK'
          });
        }
        callback(null, {
          code: 'FOUND',
          data: res
        });
      })
      .catch(err => {
        console.log('Error Udmin ceklok', err);
        callback({
          code: 'ERR_DATABASE',
          message: 'Error User ceklok',
          data: err
        });
      });
  } else {
    return callback({
      code: 'INVALID_REQUEST',
      message: 'Anda tidak bisa mengaksses fitur ini'
    });
  }
};

exports.editUserAdminCompany = (APP, req, callback) => {
  APP.models.mysql.admin
    .update(
      {
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
      },
      {
        where: {
          id: req.body.id
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
        data: err
      });
    });
};

exports.editUserAdminCeklok = (APP, req, callback) => {
  APP.models.mysql.admin_app
    .update(
      {
        name: req.body.name,
        email: req.body.email,
        user_name: req.body.username
      },
      {
        where: {
          id: req.body.id
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
        data: err
      });
    });
};

exports.editCompanyStatus = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        if (!req.body.id) {
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'id'
            }
          });
        }

        if (!req.body.status) {
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            info: {
              missingParameter: 'status'
            }
          });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
          return callback({
            code: 'ERR',
            message: 'Mohon maaf terjadi kesalahan, tidak ada gambar dipilih atau pilih gambar sekali lagi'
          });
        }

        callback(null, true);
      },

      function updateStatus(result, callback) {
        APP.models.mysql.company
          .findOne({
            where: {
              id: req.body.id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                message: 'Company tidak ditemukan!'
              });
            } else {
              APP.fileCheck(req.files.upload.data, 'doc').then(file => {
                if (file == null) {
                  callback({
                    code: 'INVALID_REQUEST',
                    message: 'File yang diunggah tidak sesuai!'
                  });
                } else {
                  let fileName = new Date().toISOString().replace(/:|\./g, '');
                  let statusPath = `./public/uploads/company_${res.company_code}/status/`;

                  res
                    .update({
                      status: req.body.status,
                      status_upload: statusPath.slice(8) + fileName + path.extname(req.files.upload.name)
                    })
                    .then(updated => {
                      // upload file
                      if (req.files.upload) {
                        req.files.upload.mv(statusPath + fileName + path.extname(req.files.upload.name), function(err) {
                          if (err)
                            return callback({
                              code: 'ERR'
                            });
                        });
                      }

                      callback(null, {
                        code: 'UPDATE_SUCCESS',
                        data: updated
                      });
                    })
                    .catch(err => {
                      console.log('Error findOne updateEmployeeStatus', err);
                      callback({
                        code: 'ERR_DATABASE',
                        message: 'Error findOne updateEmployeeStatus',
                        data: err
                      });
                    });
                }
              });
            }
          })
          .catch(err => {
            console.log('Error update updateEmployeeStatus', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error update updateEmployeeStatus',
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
