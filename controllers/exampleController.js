'use strict';

exports.test = function(APP, req, callback) {
  APP.models.mysql.admin.hasMany(APP.models.mysql.karyawan, {
    foreignKey: 'code_karyawan'
  });

  APP.models.mysql.admin.findAll().then(res => console.log(res));

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
