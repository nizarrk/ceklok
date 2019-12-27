'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const csv = require('csvjson');

exports.test = function(APP, req, callback) {
  try {
    console.log(req.currentDate);

    const file = fs.readFileSync('./public/uploads/company_VST1912090/employee/import/employee.csv', 'utf8');
    const dataObj = csv.toObject(file);
    const arr = [];
    let len = 1;
    dataObj.map(res => {
      console.log(res.dob);
      let newDate = new Date(res.dob);
      let tgl = newDate.getDate() + 1;
      if (tgl.length == 1) {
        tgl = '0' + newDate.getDate().toString();
      }
      let month = newDate.getMonth() + 1;
      let year = newDate.getFullYear().toString();

      res.dob = new Date(`${year}-${month}-${tgl}`);
      arr.push(res);
    });

    console.log(arr[0]);

    APP.models.company.ceklok_VST1912231.mysql.employee.create(arr[0]).then(res => {
      callback(null, {
        code: 'OK',
        data: res
      });
    });
  } catch (error) {
    console.log(error);
    callback({
      code: 'ERR',
      data: JSON.stringify(error)
    });
  }

  /**
   * YOUR APPLICATION LOGIC HERE...
   */
  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS
  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
