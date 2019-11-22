'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.encrypt = function(toEncrypt) {
  let encrypted,
    defaultLength = 470,
    strEncrypt = JSON.stringify(toEncrypt);

  try {
    let keys = {
      public: fs.readFileSync(path.resolve('./config', 'public.pem'), 'utf8'),
      private: fs.readFileSync(path.resolve('./config', 'private.pem'), 'utf8')
    };
    let buffer = Buffer.from(strEncrypt),
      byteLength = Buffer.byteLength(buffer);

    if (byteLength > defaultLength) {
      let encrypting,
        encrypted = [],
        interval = byteLength / defaultLength;

      for (let i = 0; i < interval; i++) {
        let start = i * defaultLength,
          end = start + defaultLength,
          sliced = buffer.slice(start, end);

        encrypting = crypto.publicEncrypt(keys.public, sliced);
        encrypted.push(encrypting.toString('base64'));
      }

      return encrypted;
    } else {
      encrypted = crypto.publicEncrypt(keys.public, buffer);

      return encrypted.toString('base64');
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.decrypt = function(toDecrypt) {
  try {
    let keys = {
      public: fs.readFileSync(path.resolve('./config', 'public.pem'), 'utf8'),
      private: fs.readFileSync(path.resolve('./config', 'private.pem'), 'utf8')
    };
    let buffer = Buffer.from(toDecrypt, 'base64'),
      decrypted = crypto.privateDecrypt(keys.private, buffer);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.log(error);
    throw error;
  }
};
