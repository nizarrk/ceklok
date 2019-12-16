'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');

exports.test = function(APP, req, callback) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return callback({
      code: 'ERR',
      message: 'No files were uploaded.'
    });
  }

  let fileName = new Date().toISOString().replace(/:|\./g, '');
  let benefitPath = './uploads/company/benefit/';
  let gradePath = './uploads/company/grade/';
  let job_titlePath = './uploads/company/job_title/';
  let departmentPath = './uploads/company/department/';

  if (!fs.existsSync(benefitPath)) {
    fs.mkdirSync(benefitPath);
  }

  if (!fs.existsSync(gradePath)) {
    fs.mkdirSync(gradePath);
  }

  if (!fs.existsSync(job_titlePath)) {
    fs.mkdirSync(job_titlePath);
  }

  if (!fs.existsSync(departmentPath)) {
    fs.mkdirSync(departmentPath);
  }

  if (req.files.benefit) {
    req.files.benefit.mv(benefitPath + fileName + path.extname(req.files.benefit.name), function(err) {
      if (err)
        return callback({
          code: 'ERR'
        });
    });
  }

  if (req.files.grade) {
    req.files.grade.mv(gradePath + fileName + path.extname(req.files.grade.name), function(err) {
      if (err)
        return callback({
          code: 'ERR'
        });
    });
  }

  if (req.files.job) {
    req.files.job.mv(job_titlePath + fileName + path.extname(req.files.job.name), function(err) {
      if (err)
        return callback({
          code: 'ERR'
        });
    });
  }

  if (req.files.department) {
    req.files.department.mv(departmentPath + fileName + path.extname(req.files.department.name), function(err) {
      if (err)
        return callback({
          code: 'ERR'
        });
    });
  }

  callback(null, {
    code: 'OK',
    data: {
      benefit: req.files.benefit ? benefitPath + fileName + path.extname(req.files.benefit.name) : null,
      grade: req.files.grade ? gradePath + fileName + path.extname(req.files.grade.name) : null,
      job: req.files.job ? job_titlePath + fileName + path.extname(req.files.job) : null,
      department: req.files.department ? departmentPath + fileName + path.extname(req.files.department.name) : null
    }
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
