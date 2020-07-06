'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const faceapi = require('face-api.js');
// Import a fetch implementation for Node.js
const fetch = require('node-fetch');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

exports.uploadAndTraining = function(APP, req, callback) {
  let { employee_face } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function uploadNewImage(callback) {
        try {
          let arr = [req.body.upload1, req.body.upload2, req.body.upload2];
          let dir = `./public/uploads/company_${req.user.code}/employee/facerecog/${req.body.label}/`;

          if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
          }

          Promise.all(
            arr.map((x, i) => {
              let base64Image = x.split(';base64,').pop();

              fs.writeFile(dir + `${i + 1}.jpg`, base64Image, { encoding: 'base64' }, function(err) {
                console.log('File created');
              });
              return dir + `${i + 1}.jpg`;
            })
          ).then(arr => {
            callback(null, {
              dir: dir,
              path: arr
            });
          });
        } catch (err) {
          console.log(err);
        }
      },

      function checkEmployeeFaces(data, callback) {
        employee_face
          .findAll({
            where: { employee_id: req.user.id },
            limit: 3
          })
          .then(res => {
            data.faces = res;
            callback(null, data);
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function saveImage(data, callback) {
        if (data.faces.length > 0) {
          //update

          Promise.all(
            data.path.map((x, i) => {
              return employee_face
                .update(
                  {
                    image: x.slice(8),
                    updated_at: new Date()
                  },
                  {
                    where: { id: data.faces[i].id }
                  }
                )
                .then(() => {
                  console.log('updated: ', data.faces[i].id);
                });
            })
          )
            .then(() => {
              callback(null, data);
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR',
                data: err
              });
            });
        } else {
          // insert

          Promise.all(
            data.path.map(x => {
              let obj = {
                employee_id: req.user.id,
                image: x.slice(8)
              };

              return obj;
            })
          )
            .then(arr => {
              employee_face
                .bulkCreate(arr)
                .then(() => {
                  callback(null, data);
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    data: err
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
      },

      function loadModelData(data, callback) {
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
            callback(null, data);
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
        let labels = [req.body.label];
        Promise.all(
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

              let img = await canvas.loadImage(`${data.dir}${i}.jpg`);
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
            let dir = `${data.dir}result/`;

            if (!fs.existsSync(dir)) {
              mkdirp.sync(dir);
            }
            Promise.all(
              arr.map(x => {
                let json = JSON.stringify(x);
                fs.writeFile(`${dir}${x.label}.json`, json, 'utf8', (err, result) => {
                  if (err) {
                    callback({
                      code: 'ERR',
                      data: err
                    });
                  } else {
                    return result;
                  }
                });
              })
            ).then(() => {
              callback(null, {
                code: 'OK',
                data: data.path
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

exports.uploadToDev = async (APP, req, callback) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return callback({
        code: 'INVALID_REQUEST',
        message: 'No files were uploaded.'
      });
    }

    let fileName = new Date().toISOString().replace(/:|\./g, '');
    let docPath = './public/' + req.body.path;

    // upload file
    if (req.files.upload) {
      req.files.upload.mv(docPath + req.files.upload.name, function(err) {
        if (err)
          return callback({
            code: 'ERR'
          });
      });

      callback(null, {
        code: 'OK',
        message: 'upload sukses'
      });
    }
  } catch (err) {
    console.log(err);
    callback({
      code: 'ERR',
      data: err
    });
  }
};
