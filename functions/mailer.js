'use strict';
const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');

exports.sendMail = data => {
  console.log('isi', data.attachments);

  fs.readFile(path.join(__dirname, '../config/template/', data.file), 'utf8', (err, file) => {
    if (err) throw err;

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ayofutsalmalang@gmail.com',
        pass: 'ayofutsal123'
      }
    });

    let mailOptions = {
      from: '"CEKLOK.ID 👻" <ayofutsalmalang@gmail.com>',
      to: data.to,
      subject: data.subject,
      attachments: data.attachments,
      html: mustache.to_html(file, data.data)
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  });
};
