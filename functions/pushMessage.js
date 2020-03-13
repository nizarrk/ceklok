'use strict';

const admin = require('firebase-admin');
const path = require('path');

module.exports = {
  firebase: (data, registrationToken) => {
    let serviceAccount = path.join(__dirname, '../config/firebase.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://papbl-api.firebaseio.com'
    });

    let payload = {
      data: data
    };

    let options = {
      priority: 'high',
      timeToLive: 60 * 60 * 24
    };

    admin
      .messaging()
      .sendToDevice(registrationToken, payload, options)
      .then(res => {
        console.log('Success:', res);
      })
      .catch(err => {
        console.log('error:', err);
      });
  }
};
