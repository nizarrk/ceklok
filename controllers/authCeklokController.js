'use strict';

const bcrypt = require('bcrypt');
const async = require('async');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const trycatch = require('trycatch');
const key = require('../config/jwt-key.json');
const jwt = require('jsonwebtoken');

exports.addSuperAdmin = (APP, req, callback) => {
  APP.models.mysql.admin_app
    .create({
      name: req.body.name,
      email: req.body.email,
      user_name: req.body.username,
      password: bcrypt.hashSync(req.body.pass, 10)
    })
    .then(res => {
      callback(null, {
        code: 'INSERT_SUCCESS'
      });
    })
    .catch(err => {
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.login = (APP, req, callback) => {
  async.waterfall(
    [
      function checkBody(callback) {
        if (!req.body.username)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, username!'
          });

        if (!req.body.pass)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, password!'
          });

        if (!req.body.platform)
          return callback({
            code: 'MISSING_KEY',
            data: req.body,
            message: 'Missing key, platform'
          });

        if (req.body.platform != 'Web')
          return callback({
            code: 'INVALID_KEY',
            data: req.body,
            message: 'Invalid key, username'
          });

        callback(null, true);
      },

      function checkSuperAdmin(index, callback) {
        APP.models.mysql.admin_app
          .findAll({
            attributes: ['id', 'name', 'password', 'photo', 'initial_login', 'status'],
            where: {
              user_name: req.body.username
            }
          })
          .then(rows => {
            if (rows.length <= 0) {
              return callback({
                code: 'NOT_FOUND',
                message: 'Invalid Username or Password'
              });
            }

            callback(null, rows);
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function commparePassword(rows, callback) {
        bcrypt
          .compare(req.body.pass, rows[0].password)
          .then(res => {
            if (res === true) {
              callback(null, {
                id: rows[0].id,
                name: rows[0].name,
                photo: rows[0].photo,
                initial_login: rows[0].initial_login
              });
            } else {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Invalid Username or Password'
              });
            }
          })
          .catch(err => {
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function setToken(rows, callback) {
        let token = jwt.sign(
          {
            id: rows.id,
            level: 1,
            superadmin: true
          },
          key.key,
          {
            expiresIn: '1d'
          }
        );

        APP.models.mongo.token
          .findOne({
            id_user: rows.id,
            level: 1,
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
                      row: rows,
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
                    data: err
                  });
                });
            } else {
              console.log('iki insert');

              APP.models.mongo.token
                .create({
                  id_user: rows.id,
                  level: 1,
                  token,
                  platform: req.body.platform,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                })
                .then(() => {
                  return callback(null, {
                    code: rows !== null ? 'FOUND' : 'NOT_FOUND',
                    data: {
                      row: rows,
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
                    data: err
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
