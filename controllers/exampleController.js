'use strict';

exports.test = function(APP, req, callback) {
  console.log(req.body.admin);

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
