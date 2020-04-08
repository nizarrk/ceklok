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
  console.log(path.join(__dirname, 'weights/'));

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
        let labels = [];
        let descriptions = [];
        labels = ['Mas_Adi'];
        return Promise.all(
          labels.map(async label => {
            for (let i = 1; i <= 1; i++) {
              let img = await canvas.loadImage(`./public/labeled_images/${label}/${i}.jpg`);

              // let imgFile = await faceapi.fetchImage(`https://pejalancoding.site/faceRecognition/labeled_images/${label}/${i}.jpg`);
              // let img = await faceapi.bufferToImage(imgFile);
              let detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

              descriptions.push(detections.descriptor);
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
          })
        )
          .then(arr => {
            console.log(arr);

            callback(null, {
              code: 'OK',
              data: arr
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
