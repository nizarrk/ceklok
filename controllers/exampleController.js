'use strict';

exports.test = function(APP, req, callback) {
  let tgl = new Date().getDate().toString();
  if (tgl.length == 1) {
    tgl = '0' + new Date().getDate().toString();
  }
  console.log(tgl);

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
