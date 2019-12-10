'use strict';

exports.test = function(APP, req, callback) {
  let randomstring = Math.random()
    .toString(36)
    .slice(-8);
  console.log(randomstring);

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
