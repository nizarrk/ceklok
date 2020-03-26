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
const moment = require('moment');
const routes = require('../routes2.json');

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
  // let time = '58:10:30';
  // let hours = moment.duration(time).asMinutes();
  // console.log(hours);
  // let minutes = moment.duration(time).minutes();
  // let hourstominutes = hours * 60;
  // let totalminutes = hourstominutes + minutes;
  // // var num = req.body.num;
  // let minutestohours = totalminutes / 60;
  // let rhours = Math.floor(minutestohours);
  // let newminutes = (minutestohours - rhours) * 60;
  // let rminutes = Math.round(newminutes);
  // console.log(totalminutes + ' minutes = ' + rhours + ' hour(s) and ' + rminutes + ' minute(s).');
  // console.log(rhours + ':' + rminutes + ':' + '00');
  // console.log(APP.time.timeDuration(hours));
  // let result = [1,1,1,2,2,3,3,4,5]
  // let userID = result.filter((item, index) => result.indexOf(item) === index)
  // console.log(userID);
  // const durations = ['12:00:00', '15:00:00', '03:30:00'];
  // //  console.log(APP.time.timeDuration(durations));
  // let n = 0;
  // durations.map(x => {
  //   n++;
  // });
  // console.log(n);
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
  // let format = 'hh:mm:ss';
  // // var time = moment() gives you current time. no format required.
  // let time = moment(),
  //   beforeTime = moment('08:34:00', format),
  //   afterTime = moment('23:34:00', format);
  // console.log(time);
  // if (time.isBetween(beforeTime, afterTime)) {
  //   console.log('is between');
  // } else {
  //   console.log('is not between');
  // }
  // let arr = [];
  // let endpoint = [];
  // let arr2 = [];
  // routes.map((x, index) => {
  //   endpoint.push(Object.keys(x));
  // });
  // // console.log(endpoint);
  // endpoint.map((x, index) => {
  //   let obj = {};
  //   console.log(x);
  //   obj.endpoint = x[0];
  //   obj.feature_id = routes[index][x].feature_id;
  //   obj.subfeature_id = routes[index][x].subfeature_id;
  //   obj.method = routes[index][x].method;
  //   obj.controller = routes[index][x].controller;
  //   obj.function = routes[index][x].function;
  //   (obj.auth = routes[index][x].auth == true ? 1 : 0), (obj.level = routes[index][x].level);
  //   arr.push(obj);
  // });
  // callback(null, {
  //   code: 'OK',
  //   data: arr
  // });
  // let time = APP.time.timeXday('08:00:00', 5);
  // let kurang = '01:00:00';
  // let durationTime = moment.duration(time);
  // let durationKurang = moment.duration(kurang);
  // let real = moment.duration(durationTime - durationKurang);
  // let hasil = (real / durationTime) * 100;
  // let a = moment.duration(APP.time.timeXday(req.body.start, 4)).asMinutes();
  // let b = moment.duration(APP.time.timeXday(req.body.end, 4)).asMinutes();
  // console.log('awaw', b);
  // let hasil = moment.duration(APP.time.timeSubstract(a, b)).asMinutes();
  // console.log(hasil);
  // let minus;
  // let over;
  // if (hasil < 0) {
  //   minus = APP.time.timeSubstract(a, b);
  //   over = '00:00:00';
  // }
  // if (hasil > 0) {
  //   over = APP.time.timeSubstract(a, b);
  //   minus = '00:00:00';
  // }
  // console.log(`minus = ${minus}, over = ${over}`);
  // let timeCompare = moment(req.body.start, 'HH:mm:ss').diff(
  //   moment(APP.time.timeXday(req.body.end, 4), 'HH:mm:ss')
  // );
  // console.log(timeCompare);
  // let { letter } = APP.models.company[req.user.db].mysql;
  // let tes = APP.generateCode(letter, 'L');
  // Promise.resolve(tes).then(tes => {
  //   console.log(tes);
  let db = req.user.level !== undefined ? req.user.db : `${process.env.MYSQL_NAME}_${req.body.company}`;
  console.log(db);

  callback(null, {
    code: 'OK',
    message: 'aw'
  });
};
