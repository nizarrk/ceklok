'use strict';
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const csv = require('csvjson');
const trycatch = require('trycatch');
const mkdirp = require('mkdirp');
const bcrypt = require('bcrypt');
// const moment = require('moment');
const moment = require('moment-business-days');

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

  // let time = '08:10:00';
  // let hours = moment.duration(time).hours() * 5;
  // let minutes = moment.duration(time).minutes() * 5;
  // let hourstominutes = hours * 60;
  // let totalminutes = hourstominutes + minutes;

  // // var num = req.body.num;
  // let minutestohours = totalminutes / 60;
  // let rhours = Math.floor(minutestohours);
  // let newminutes = (minutestohours - rhours) * 60;
  // let rminutes = Math.round(newminutes);
  // console.log(totalminutes + ' minutes = ' + rhours + ' hour(s) and ' + rminutes + ' minute(s).');
  // console.log(rhours + ':' + rminutes + ':' + '00');

  // moment.updateLocale('us', {
  //   workingWeekdays: [1, 2, 3, 5, 6]
  // });

  //  let diff = moment(req.body.end, 'YYYY-MM-DD').businessDiff(moment(req.body.start,'YYYY-MM-DD'));
  //  console.log(diff);
  //  let add = moment(req.body.start, 'YYYY-MM-DD').monthBusinessDays()
  //  console.log(add.length);

  // let startDate = moment(req.body.start),
  //     days = 5,
  //     defaultDays = startDate.clone().add(days, 'days').format('YYYY-MM-DD'),
  //     bussinessDays = startDate.clone().businessAdd(days).format('YYYY-MM-DD');

  //     console.log(defaultDays);
  //     console.log(bussinessDays);

  // let date1 = moment(req.body.start);
  // let date2 = moment(req.body.end);
  // let diff = date2.diff(date1, 'days') + 1 // +1 biar hari pertama keitung cuti
  // let listDate = [];
  // let dateMove = new Date(date1);
  // let strDate = req.body.start;

  // while (strDate < req.body.end){
  //   strDate = dateMove.toISOString().slice(0,10);
  //   // listDate.push(strDate);
  //   dateMove.setDate(dateMove.getDate()+1);
  //   let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

  //   if (!checkDay) {
  //     listDate.push(strDate);
  //   }
  // };
  // console.log(listDate);
  // console.log(listDate.length);

  // console.log(date2.diff(date1, 'days') + 1);

  // let then = '09:00:00';
  // let now = '23:20:30';

  // let hasil = moment.utc(moment(now, 'HH:mm:ss').diff(moment(then, 'HH:mm:ss'))).format('HH:mm:ss');
  // console.log(hasil);
  // let where1;
  // if (req.body.status) {
  //   where1 = {
  //     status: req.body.status
  //   };
  // }
  // let where2;
  // if (req.body.start && req.body.end) {
  //   where2 = {
  //     created_by: {
  //       $between: [req.body.start, req.body.end]
  //     }
  //   };
  // }
  // APP.models.company[req.user.db].mysql.absent_cuti
  //   .findAll({
  //     where: { where1, where2 }
  //   })
  //   .then(res => {
  //     callback(null, {
  //       code: 'OK',
  //       data: res
  //     });
  //   });
  let format = 'hh:mm:ss';

  // var time = moment() gives you current time. no format required.
  let time = moment(),
    beforeTime = moment('08:34:00', format),
    afterTime = moment('23:34:00', format);

  console.log(time);

  if (time.isBetween(beforeTime, afterTime)) {
    console.log('is between');
  } else {
    console.log('is not between');
  }
};
