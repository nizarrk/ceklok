'use strict';
const async = require('async');

exports.test = function(APP, req, callback) {
  console.log(req.files);

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
