'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');

exports.test = function(APP, req, callback) {
  console.log(req.get('host'));

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
