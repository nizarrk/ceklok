'use strict';
const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const db = require('../db').mongo;

exports.sendMail = data => {
  let { _logs_email } = db.models;
  fs.readFile(path.join(__dirname, '../config/template/', data.file), 'utf8', (err, file) => {
    if (err) throw err;

    let transporter = nodemailer.createTransport({
      host: String(process.env.EMAIL_HOST),
      port: String(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT == 465 ? true : false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    let mailOptions = {
      from: String(process.env.EMAIL_SENDER),
      to: data.to,
      subject: data.subject,
      attachments: data.attachments,
      html: mustache.to_html(file, data.data)
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        _logs_email
          .create({
            data: JSON.stringify(data),
            date: new Date(),
            error: true
          })
          .then(() => {
            console.log('error send email');
            console.log(error);
          })
          .catch(err => {
            console.log('Error create', err);
          });
      } else {
        console.log('berhasil harusnya');

        _logs_email
          .create({
            data: JSON.stringify(data),
            date: new Date(),
            error: false
          })
          .then(() => {
            console.log('Email sent: ' + info.response);
          })
          .catch(err => {
            console.log('Error create', err);
          });
      }
    });
  });
};
