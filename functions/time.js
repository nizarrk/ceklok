'use strict';

const moment = require('moment-business-days');

exports.timeXday = (time, days) => {
  let hours = moment.duration(time).hours() * days;
  let minutes = moment.duration(time).minutes() * days;
  let hourstominutes = hours * 60;
  let totalminutes = hourstominutes + minutes;

  let minutestohours = totalminutes / 60;
  let rhours = Math.floor(minutestohours);
  let newminutes = (minutestohours - rhours) * 60;
  let rminutes = Math.round(newminutes);

  let customHours = rhours.toString().length == 1 ? '0' + rhours : rhours;
  let customMinutes = rminutes.toString().length == 1 ? '0' + rminutes : rminutes;
  console.log(customMinutes);

  let result = customHours + ':' + customMinutes + ':' + '00';
  console.log(totalminutes + ' minutes = ' + rhours + ' hour(s) and ' + rminutes + ' minute(s).');
  console.log(result);

  return result;
};
