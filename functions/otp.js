'use strict';

exports.generateOTP = () => {
  // Declare a digits variable which stores all digits
  let digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  console.log('OTP of 4 digits: ', OTP);

  return OTP;
};
