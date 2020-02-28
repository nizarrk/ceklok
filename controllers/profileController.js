'use strict';

const bcrypt = require('bcrypt');
const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const fs = require('fs');

const checkExistingTelp = (APP, data, req, callback) => {
  let db = req.user.db !== null ? req.user.db : process.env.DBNAME + req.body.company;
  let { admin_app, admin } = APP.models.mysql;
  let { employee } = APP.models.company[req.user.db].mysql;
  let query =
    req.user.level === 1
      ? admin_app
      : req.user.level === 2
      ? admin
      : req.user.level === 3
      ? employee
      : callback({
          code: 'INVALID_REQUEST',
          message: 'User Level Undefined'
        });
  query
    .findAll({
      where: {
        tlp: req.body.telp
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        if (res[0].tlp == data.tlp) {
          return callback(null, true);
        }
        return callback({
          code: 'DUPLICATE',
          message: 'Error! Duplicate telp!'
        });
      }

      callback(null, true);
    })
    .catch(err => {
      console.log('iki error telp', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

const checkExistingEmail = (APP, data, req, callback) => {
  let db = req.user.db !== null ? req.user.db : process.env.DBNAME + req.body.company;
  let { admin_app, admin } = APP.models.mysql;
  let { employee } = APP.models.company[req.user.db].mysql;
  let query =
    req.user.level === 1
      ? admin_app
      : req.user.level === 2
      ? admin
      : req.user.level === 3
      ? employee
      : callback({
          code: 'INVALID_REQUEST',
          message: 'User Level Undefined'
        });
  query
    .findAll({
      where: {
        email: req.body.email
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        if (res[0].email == data.email) {
          return callback(null, true);
        }
        return callback({
          code: 'DUPLICATE',
          message: 'Error! Duplicate Email!'
        });
      }

      return callback(null, true);
    })
    .catch(err => {
      console.log('iki error email', err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

const checkExistingUsername = (APP, data, req, callback) => {
  let db = req.user.db !== null ? req.user.db : process.env.DBNAME + req.body.company;
  let { admin_app, admin } = APP.models.mysql;
  let { employee } = APP.models.company[req.user.db].mysql;
  let query =
    req.user.level === 1
      ? admin_app
      : req.user.level === 2
      ? admin
      : req.user.level === 3
      ? employee
      : callback({
          code: 'INVALID_REQUEST',
          message: 'User Level Undefined'
        });
  query
    .findAll({
      where: {
        user_name: req.body.username
      }
    })
    .then(res => {
      if (res && res.length > 0) {
        if (res[0].user_name == data.user_name) {
          return callback(null, true);
        }
        return callback({
          code: 'DUPLICATE',
          message: 'Error! Duplicate Username!'
        });
      }

      callback(null, true);
    })
    .catch(err => {
      console.log('iki error username', err);

      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

const checkExistingCredentials = (APP, data, req, callback) => {
  async.waterfall(
    [
      function checkUsername(callback) {
        checkExistingUsername(APP, data, req, callback);
      },

      function checkTelp(result, callback) {
        checkExistingTelp(APP, data, req, callback);
      },

      function checkEmail(result, callback) {
        checkExistingEmail(APP, data, req, callback);
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.updateProfile = (APP, req, callback) => {
  let { name, pob, dob, address, kel, kec, zip, prov, city, gender, telp, username, email } = req.body;
  async.waterfall(
    [
      function checkParams(callback) {
        if (!req.body) {
          callback({
            code: 'INVALID_REQUEST',
            id: 'ETQ96',
            message: 'Kesalahan pada parameter'
          });
        } else {
          callback(null, true);
        }
      },

      function getCurrentData(data, callback) {
        let { admin_app, admin } = APP.models.mysql;
        let { employee } = APP.models.company[req.user.db].mysql;
        let query =
          req.user.level === 1
            ? admin_app
            : req.user.level === 2
            ? admin
            : req.user.level === 3
            ? employee
            : callback({
                code: 'INVALID_REQUEST',
                message: 'User Level Undefined'
              });
        query
          .findOne({
            where: {
              id: req.user.id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: 'ETQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              callback(null, res.dataValues);
            }
          });
      },

      function checkCredentials(data, callback) {
        checkExistingCredentials(APP, data, req, callback);
      },

      function updateProfile(data, callback) {
        if (req.user.level === 1) {
          let { admin_app } = APP.models.mysql;

          admin_app
            .update(
              {
                name: name,
                gender: gender,
                pob: pob,
                dob: dob,
                address: address,
                kelurahan: kel,
                kecamatan: kec,
                city: city,
                province: prov,
                zipcode: zip,
                tlp: telp,
                email: email,
                user_name: username
              },
              {
                where: {
                  id: req.user.id
                }
              }
            )
            .then(res => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                id: 'ETP00',
                message: 'Profile berhasil diubah',
                data: res
              });
            })
            .catch(err => {
              console.log('Error updateProfile', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'ETQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami (updateProfile)'
              });
            });
        } else if (req.user.level === 2) {
          let { admin } = APP.models.mysql;

          admin
            .update(
              {
                name: name,
                gender: gender,
                pob: pob,
                dob: dob,
                address: address,
                kelurahan: kel,
                kecamatan: kec,
                city: city,
                province: prov,
                zipcode: zip,
                tlp: telp,
                email: email,
                user_name: username
              },
              {
                where: {
                  id: req.user.id
                }
              }
            )
            .then(res => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                id: 'ETP00',
                message: 'Profile berhasil diubah',
                data: res
              });
            })
            .catch(err => {
              console.log('Error updateProfile', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'ETQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami (updateProfile)'
              });
            });
        } else if (req.user.level === 3) {
          let { employee } = APP.models.company[req.user.db].mysql;

          employee
            .update(
              {
                name: name,
                gender: gender,
                pob: pob,
                dob: dob,
                address: address,
                kelurahan: kel,
                kecamatan: kec,
                city: city,
                province: prov,
                zipcode: zip,
                tlp: telp,
                email: email,
                user_name: username
              },
              {
                where: {
                  id: req.user.id
                }
              }
            )
            .then(res => {
              callback(null, {
                code: 'UPDATE_SUCCESS',
                id: 'ETP00',
                message: 'Profile berhasil diubah',
                data: res
              });
            })
            .catch(err => {
              console.log('Error updateProfile', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'ETQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami (updateProfile)'
              });
            });
        } else {
          callback({
            code: 'INVALID_REQUEST'
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

exports.updateProfilePhoto = (APP, req, callback) => {
  async.waterfall(
    [
      function uploadPath(callback) {
        trycatch(
          () => {
            let directory =
              req.user.level === 1
                ? 'Admin CEKLOK/'
                : req.user.level === 2
                ? `company_${req.user.code}/admin`
                : req.user.level === 3
                ? `company_${req.user.code}/employee`
                : '';

            if (!req.files || Object.keys(req.files).length === 0) {
              return callback({
                code: 'INVALID_REQUEST',
                message: 'No files were uploaded.'
              });
            }

            let fileName = new Date().toISOString().replace(/:|\./g, '');
            let imagePath = `./public/uploads/${directory}/`;

            callback(null, imagePath + fileName + path.extname(req.files.image.name));
          },
          err => {
            console.log(err);

            callback({
              code: 'ERR',
              id: 'ETP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          }
        );
      },

      function updateProfileData(data, callback) {
        let query;
        if (req.user.level === 1) {
          query = APP.models.mysql.admin_app;
        } else if (req.user.level === 2) {
          query = APP.models.mysql.admin;
        } else if (req.user.level === 3) {
          query = APP.models.company[req.user.db].mysql.employee;
        } else {
          callback({
            code: 'INVALID_REQUEST'
          });
        }

        query
          .update(
            {
              photo: data.slice(8)
            },
            {
              where: {
                id: req.user.id
              }
            }
          )
          .then(res => {
            if (req.files.image) {
              req.files.image.mv(data, function(err) {
                if (err)
                  return callback({
                    code: 'ERR',
                    id: 'ETP01',
                    message: 'Terjadi Kesalahan, mohon coba kembali',
                    data: err
                  });
              });
            }

            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'ETP00',
              message: 'Foto Profile berhasil diubah'
            });
          })
          .catch(err => {
            console.log('Error updateProfile', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'ETQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami (updateProfile)'
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

exports.changePassword = (APP, req, callback) => {
  let query;
  if (req.user.level === 1) {
    query = APP.models.mysql.admin_app;
  } else if (req.user.level === 2) {
    query = APP.models.mysql.admin;
  } else if (req.user.level === 3) {
    query = APP.models.company[req.user.db].mysql.employee;
  } else {
    callback({
      code: 'INVALID_REQUEST'
    });
  }
  async.waterfall(
    [
      function checkParams(callback) {
        if (req.body.old && req.body.pass && req.body.konf) {
          let password = APP.validation.password(req.body.pass);
          let konfirm = APP.validation.password(req.body.konf);

          if (password != true) {
            return callback(password);
          }

          if (konfirm != true) {
            console.log('konfirm');

            return callback(konfirm);
          }

          if (req.body.konf !== req.body.pass) {
            return callback({
              code: 'INVALID_REQUEST',
              id: 'ETQ96',
              message: 'Kesalahan pada parameter, password dan konfirm tidak sesuai'
            });
          }

          callback(null, true);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'ETQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkPassword(result, callback) {
        query
          .findOne({
            where: {
              id: req.user.id
            }
          })
          .then(res => {
            if (res == null) {
              callback({
                code: 'NOT_FOUND',
                id: 'CPQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              let oldpass = bcrypt.compareSync(req.body.old, res.password);
              let newpass = bcrypt.compareSync(req.body.pass, res.password);

              if (!oldpass) {
                return callback({
                  code: 'INVALID_REQUEST',
                  id: 'ETQ96',
                  message: 'Kesalahan pada parameter, password lama tidak sesuai'
                });
              } else if (newpass) {
                return callback({
                  code: 'INVALID_REQUEST',
                  id: 'CPP01',
                  message: 'Password sudah pernah digunakan, gunakan password lain'
                });
              } else {
                callback(null, true);
              }
            }
          })
          .catch(err => {
            console.log('Error checkPassword', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'CPQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      },

      function encryptPassword(result, callback) {
        let pass = APP.validation.password(req.body.pass);
        if (pass === true) {
          bcrypt.hash(req.body.pass, 10).then(hashed => {
            callback(null, hashed);
          });
        } else {
          callback(pass);
        }
      },

      function updatePassword(result, callback) {
        query
          .update(
            {
              password: result,
              updated_at: new Date(),
              action_by: req.user.id
            },
            {
              where: {
                id: req.user.id
              }
            }
          )
          .then(updated => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'CPP00',
              message: 'Password berhasil diubah',
              data: updated
            });
          })
          .catch(err => {
            console.log('Error findOne updatePassword', err);
            callback({
              code: 'ERR_DATABASE',
              message: 'Error findOne updatePassword',
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
