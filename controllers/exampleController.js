'use strict';
const async = require('async');

exports.test = function(APP, req, callback) {
  let ids = ['1', '2', '3', '4', '5', '6'];
  let len = 0;
  let x = [];
  ids.map(res => {
    APP.models.company[req.user.db].mysql.benefit
      .findOne({
        where: {
          id: res
        }
      })
      .then(result => {
        x.push(result);
        len++;
        if (len === ids.length) {
          console.log('oyi');
          callback(null, {
            code: 'OK',
            data: x
          });
        }
      })
      .catch(err => {
        console.log(err);
      });
  });

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
