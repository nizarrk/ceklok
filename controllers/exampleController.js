'use strict';

exports.test = function(APP, req, callback) {
  /**
   * YOUR APPLICATION LOGIC HERE...
   */

  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  callback(null, {
    code: 'OK'
  });

  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
