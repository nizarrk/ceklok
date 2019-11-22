'use strict';

// const fs = require('fs');
// const path = require('path');

// var NodeRSA = require('node-rsa');
// var key = new NodeRSA({b: 4096});
// var publicKey = key.exportKey('pkcs8-public-pem');
// var privateKey = key.exportKey('pkcs1-pem');
// fs.openSync('config/public.pem', 'w');
// fs.writeFileSync('config/public.pem', publicKey, 'utf8');
// fs.openSync('config/private.pem', 'w');
// fs.writeFileSync('config/private.pem', privateKey, 'utf8');

const NodeRSA = require('node-rsa');
const key = new NodeRSA({ b: 512 });
const keyString = require('../config/rsa-key');
key.importKey(keyString.key);

exports.encrypt = text => {
  const encrypted = key.encrypt(text, 'base64');
  //console.log('encrypted: ', encrypted);
  return encrypted;
};

exports.decrypt = text => {
  const decrypted = key.decrypt(text, 'utf8');
  //console.log('decrypted: ', decrypted);
  return decrypted;
};
