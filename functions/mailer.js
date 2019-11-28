'use strict';
const nodemailer = require('nodemailer');

exports.sendMail = data => {
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
    text: data.text
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};
