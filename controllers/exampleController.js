'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const csv = require('csvjson');
const trycatch = require('trycatch');
const mkdirp = require('mkdirp');
const bcrypt = require('bcrypt');
// const moment = require('moment');
const moment = require('moment');
const routes = require('../routes2.json');
const faceapi = require('face-api.js');
// Import a fetch implementation for Node.js
const fetch = require('node-fetch');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

exports.test = function(APP, req, callback) {
  async.waterfall(
    [
      function loadModelData(callback) {
        Promise.all([
          console.log('Load module ...'),
          faceapi.nets.tinyFaceDetector.loadFromDisk('./public/weights/'),
          faceapi.nets.faceRecognitionNet.loadFromDisk('./public/weights/'),
          faceapi.nets.faceLandmark68Net.loadFromDisk('./public/weights/'),
          faceapi.nets.faceLandmark68TinyNet.loadFromDisk('./public/weights/'),
          faceapi.nets.ssdMobilenetv1.loadFromDisk('./public/weights/'),
          faceapi.nets.ageGenderNet.loadFromDisk('./public/weights/'),
          faceapi.nets.faceExpressionNet.loadFromDisk('./public/weights/')
        ])
          .then(() => {
            console.log('Module Loaded');
            callback(null, true);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },

      function training(data, callback) {
        // let labels = [];
        let descriptions = {};
        let labels = fs.readdirSync('./public/labeled_images/');
        return Promise.all(
          labels.map(async label => {
            descriptions[label] = [];
            // console.log(label);

            // let images = fs.readdirSync(`./public/labeled_images/${label}/`);

            // return images.map(img => {
            //   canvas.loadImage(`./public/labeled_images/${label}/${img}`)
            //     .then(async image => {
            //       console.log(image);
            //       return faceapi.detectSingleFace(image)
            //       .withFaceLandmarks()
            //       .withFaceDescriptor()
            //       .then(detection => {
            //         // console.log(detection.descriptor);
            //         descriptions.push(detection.descriptor);
            //         return new faceapi.LabeledFaceDescriptors(label, descriptions);
            //       })
            //     })
            // })

            for (let i = 1; i <= 1; i++) {
              console.log('masuk for iterasi ke:', i);

              let img = await canvas.loadImage(`./public/labeled_images/${label}/${i}.jpg`);
              console.log(img);

              // let imgFile = await faceapi.fetchImage(`https://pejalancoding.site/faceRecognition/labeled_images/${label}/${i}.jpg`);
              // let img = await faceapi.bufferToImage(imgFile);
              let detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

              descriptions[label].push(detections.descriptor);
            }
            console.log('keluar for');

            let loadLabeledImages = new faceapi.LabeledFaceDescriptors(label, descriptions[label]);

            return loadLabeledImages;
            // let faceMatcher = new faceapi.FaceMatcher(loadLabeledImages, 0.6);
            // return faceMatcher;
          })
        )
          .then(arr => {
            console.log(arr);

            Promise.all(
              arr.map(x => {
                let json = JSON.stringify(x);
                fs.writeFile(`./public/training/${x.label}.json`, json, 'utf8', (err, result) => {
                  if (err) {
                    console.log(err);

                    return callback({
                      code: 'ERR',
                      data: err
                    });
                  } else {
                    return result;
                  }
                });
              })
            ).then(result => {
              callback(null, {
                code: 'OK',
                data: result
              });
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
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

exports.testing = async (APP, req, callback) => {
  try {
    let base64String = req.body.upload;
    let base64Image = base64String.split(';base64,').pop();

    let dir = './public/uploadsssss/';

    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }

    fs.writeFile(dir + 'tes.jpg', base64Image, { encoding: 'base64' }, function(err) {
      console.log('File created');
      callback(null, {
        code: 'OK',
        message: 'upload sukses'
      });
    });
    // if (!req.files || Object.keys(req.files).length === 0) {
    //   return callback({
    //     code: 'INVALID_REQUEST',
    //     message: 'No files were uploaded.'
    //   });
    // }

    // let fileName = new Date().toISOString().replace(/:|\./g, '');
    // let docPath = './public/' + req.body.path;

    // // upload file
    // if (req.files.upload) {
    //   req.files.upload.mv(docPath + req.files.upload.name, function(err) {
    //     if (err)
    //       return callback({
    //         code: 'ERR'
    //       });
    //   });

    //   callback(null, {
    //     code: 'OK',
    //     message: 'upload sukses'
    //   });
    // }
  } catch (err) {
    console.log(err);
    callback({
      code: 'ERR',
      data: err
    });
  }
};
