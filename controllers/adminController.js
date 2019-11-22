'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');

exports.checkExistingEmail = (APP, req, callback) => {
  APP.models.mysql.admin
    .findAll({
      where: {
        email_company: req.body.email
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: {
          row: res && res.length > 0 ? APP.rsa.encrypt(res) : []
        },
        info: {
          dataCount: res.length,
          parameter: 'email_company'
        }
      });
    })
    .catch(err => {
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
        username: req.body.username
      }
    })
    .then(res => {
      callback(null, {
        code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: {
          row: res && res.length > 0 ? APP.rsa.encrypt(res) : []
        },
        info: {
          dataCount: res.length,
          parameter: 'username'
        }
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: JSON.stringify(err)
      });
    });
};

exports.register = (APP, req, callback) => {
  async.waterfall(
    [
      function encryptPassword(callback) {
        let pass = APP.validation.password(req.body.pass);
        if (pass === true) {
          bcrypt.hash(req.body.pass, 10).then(hashed => {
            return callback(null, hashed);
          });
        } else {
          return callback(pass);
        }
      },

      function registerUser(hashed, callback) {
        let email = APP.validation.email(req.body.email);
        let username = APP.validation.username(req.body.username);

        if (email == true && username == true) {
          APP.models.mysql.admin
            .build({
              nama_company: req.body.nama,
              email_company: req.body.email,
              username: req.body.username,
              //company code semntara
              code_company: req.body.company,
              password: hashed
            })
            .save()
            .then(result => {
              let params = 'Insert Success'; //This is only example, Object can also be used
              return callback(null, {
                code: 'INSERT_SUCCESS',
                data: APP.rsa.encrypt(result.dataValues || params)
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
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
