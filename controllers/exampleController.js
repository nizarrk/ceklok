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

  // let start = moment(req.body.start)
  //   .subtract(1, 'days')
  //   .format('YYYY-MM-DD');
  // let end = moment(req.body.end)
  //   .add(1, 'days')
  //   .format('YYYY-MM-DD');

  // const date1 = new Date(req.body.start);
  // const date2 = new Date(req.body.end);
  // const diffTime = Math.abs(date2 - date1);
  // const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  // console.log(diffDays);

  // var listDate = [];
  // var startDate ='2020-02-01';
  // var endDate = '2020-03-01';
  // var dateMove = new Date(startDate);
  // var strDate = startDate;

  // var is_weekend =  function(date1){
  //   var dt = new Date(date1);

  //   if(dt.getDay() == 6 || dt.getDay() == 0)
  //      {
  //       listDate.push(date1);
  //       console.log(`${date1} weekend`);
  //       }
  // }

  // while (strDate < endDate){
  //   var strDate = dateMove.toISOString().slice(0,10);
  //   // listDate.push(strDate);
  //   dateMove.setDate(dateMove.getDate()+1);
  //   is_weekend(strDate)
  // };

  // let time = moment.duration("08:00:00").hours();

  let time = '08:10:00';
  let hours = moment.duration(time).hours() * 5;
  let minutes = moment.duration(time).minutes() * 5;
  let hourstominutes = hours * 60;
  let totalminutes = hourstominutes + minutes;

  // var num = req.body.num;
  let minutestohours = totalminutes / 60;
  let rhours = Math.floor(minutestohours);
  let newminutes = (minutestohours - rhours) * 60;
  let rminutes = Math.round(newminutes);
  console.log(totalminutes + ' minutes = ' + rhours + ' hour(s) and ' + rminutes + ' minute(s).');
  console.log(rhours + ':' + rminutes + ':' + '00');
};
