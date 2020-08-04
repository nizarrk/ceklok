'use strict';

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

exports.uploadCDN = (APP, req, callback) => {
  console.log('masuk controller cdn');
  req.files.file.mv(req.body.directory, function(err) {
    if (err)
      return callback({
        code: 'ERR',
        id: '',
        message: 'Terjadi Kesalahan, mohon coba kembali',
        data: err
      });

    callback(null, {
      code: 'OK',
      id: '',
      message: 'Success file upload',
      data: {
        directory: req.body.directory
      }
    });
  });
};

exports.writeFileCDN = (APP, req, callback) => {
  console.log('masuk controller base64 cdn');

  // remove filename
  let dir = req.body.directory;
  dir = dir.substr(0, dir.lastIndexOf('/'));

  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir);
  }

  fs.writeFile(req.body.directory, req.body.file, { encoding: req.body.encoding }, (err, result) => {
    if (err) {
      callback({
        code: 'ERR',
        data: err
      });
    } else {
      callback(null, {
        code: 'OK',
        id: '',
        message: 'Success writing new file!',
        data: {
          directory: req.body.directory
        }
      });
    }
  });
};
