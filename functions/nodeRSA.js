'use strict';

const NodeRSA = require('node-rsa');
const key = new NodeRSA({ b: 512 });
const keyString = require('../config/rsa-key');
key.importKey(keyString.key);

exports.encrypt = text => {
  const encrypted = key.encrypt(text, 'base64');
  console.log('encrypted: ', encrypted);
  return encrypted;
};

exports.decrypt = text => {
  const decrypted = key.decrypt(text, 'utf8');
  console.log('decrypted: ', decrypted);
  return decrypted;
};
