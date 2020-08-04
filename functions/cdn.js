'use strict';

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const isBase64 = require('is-base64');
const validation = require('./validation');

exports.uploadCDN = (file, directory) => {
  try {
    const formData = new FormData();

    if (formData instanceof FormData) {
      formData.append('directory', directory);
      formData.append('file', fs.createReadStream(file.tempFilePath));

      return axios({
        method: 'post',
        url: `${process.env.CDN_HOST}/cdn/upload`,
        headers: formData.getHeaders(),
        data: formData
      })
        .then(res => {
          return { data: res.data, error: false };
        })
        .catch(err => {
          console.log(err.message);
          return { data: err.message, error: true };
        });
    } else {
      throw new Error('File is not FormData!');
    }
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

exports.writeFileCDN = (file, directory, encoding) => {
  let form = {};
  if (isBase64(file, { mimeRequired: true })) {
    console.log('masuk base64 cdn');
    // base64 encoded data doesn't contain commas
    let base64ContentArray = file.split(',');

    // base64 content cannot contain whitespaces but nevertheless skip if there are!
    let mimeType = base64ContentArray[0].match(/[^:\s*]\w+\/[\w-+\d.]+(?=[;| ])/)[0];

    // base64 encoded data - pure
    let base64Data = validation.xss(base64ContentArray[1]); // filter xss

    if (mimeType == 'image/jpeg' || mimeType == 'image/png') {
      form = {
        file: base64Data,
        directory: directory,
        encoding: 'base64'
      };
    } else {
      throw new Error('INVALID_REQUEST');
    }
  } else if (isBase64(file)) {
    console.log('mime not found!');
    throw new Error('INVALID_REQUEST');
  } else {
    form = {
      file: file,
      directory: directory,
      encoding: encoding
    };
  }

  return axios({
    method: 'post',
    url: `${process.env.CDN_HOST}/cdn/write`,
    data: form
  })
    .then(res => {
      return { data: res.data, error: false };
    })
    .catch(err => {
      console.log(err.message);
      return { data: err.message, error: true };
    });
};
