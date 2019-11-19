'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');

exports.register = (APP, req, callback) => {
  bcrypt.hash(req.body.pass, 10).then(hash => {
    APP.models.mysql.user
      .build({
        nama: req.body.nama,
        email: req.body.email,
        username: req.body.username,
        telp: req.body.telp,
        password: hash
      })
      .save()
      .then(result => {
        let params = 'Insert Success'; //This is only example, Object can also be used
        return callback(null, {
          code: 'INSERT_SUCCESS',
          data: APP.nodeRSA.encrypt(result.dataValues || params)
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
  });
};

exports.login = async (APP, req, callback) => {
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

  APP.models.mysql.user
    .findAll({
      where: {
        username: req.body.username
      }
    })
    .then(rows => {
      bcrypt
        .compare(req.body.pass, rows[0].password)
        .then(res => {
          if (res === true) {
            let token = jwt.sign(
              {
                id: rows[0].id
              },
              key.key,
              {
                expiresIn: '1d'
              }
            );

            return callback(null, {
              code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
              data: {
                row: APP.nodeRSA.encrypt(rows[0]),
                token
              },
              info: {
                dataCount: rows.length
              }
            });
          } else {
            return callback({
              code: 'INVALID_PASSWORD',
              info: {
                parameter: 'password did not match'
              }
            });
          }
        })
        .catch(err => {
          return callback({
            code: 'ERR_BCRYPT',
            data: JSON.stringify(err)
          });
        })
        .catch(err => {
          return callback({
            code: 'ERR_DATABASE',
            data: JSON.stringify(err)
          });
        });
    });
};
