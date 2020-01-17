'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const csv = require('csvjson');
const trycatch = require('trycatch');
const mkdirp = require('mkdirp');
const bcrypt = require('bcrypt');
const moment = require('moment');

exports.test = function(APP, req, callback) {
  // let total = 12
  // let sisa = 12 - (new Date().getMonth() + 1)
  // let hitung = 12 - sisa
  // console.log(total - hitung)

  let start = moment(req.body.start)
    .subtract(1, 'days')
    .format('YYYY-MM-DD');
  let end = moment(req.body.end)
    .add(1, 'days')
    .format('YYYY-MM-DD');

  console.log(start);
  console.log(end);
};
