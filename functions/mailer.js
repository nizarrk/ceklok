'use strict';
const nodemailer = require('nodemailer');

// async..await is not allowed in global scope, must use a wrapper
exports.sendMail = (to, otp) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ayofutsalmalang@gmail.com',
      pass: 'ayofutsal123'
    }
  });

  let mailOptions = {
    from: 'CEKLOK.ID',
    to: to,
    subject: 'Sending Email using Node.js',
    text: `That was easy! This is your OTP: ${otp}`
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};
