'use strict';

let jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
let config = require('../config/jwt-key.json'); // get our config file
// Your Database configurations.
const db = require('../db');
const model = require('../models/mongo/token');
const TokenModel = model(db.mongo);

function verifyToken(req, res, next) {
  // check header or url parameters or post parameters for token
  let token = req.headers['authorization'];

  if (!token) return res.status(403).send({ auth: false, message: 'No token provided.' });

  // search token in mongo
  TokenModel.findOne({
    token: token
  })
    .then(result => {
      if (result !== null) {
        // verifies secret and checks exp
        jwt.verify(token, config.key, function(err, decoded) {
          if (err) return res.status(401).send({ auth: false, status: 401, message: 'Failed to authenticate token.' });

          // if everything is good, save to request for use in other routes
          req.user = decoded;
          next();
        });
      } else {
        return res.status(401).send({ auth: false, status: 401, message: 'Failed to authenticate token.' });
      }
    })
    .catch(err => {
      return res.status(401).send({ auth: false, status: 401, message: err });
    });
}

module.exports = verifyToken;
