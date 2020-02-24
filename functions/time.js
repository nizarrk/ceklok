'use strict';

let moment = require('moment');
let momentDurationFormatSetup = require('moment-duration-format');

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

exports.timeDuration = time => {
  if (Array.isArray(time)) {
    let total = 0;

    time.map(x => {
      total += moment.duration(x).asMinutes();
    });

    let dur = moment.duration(total, 'minutes');

    let result = dur.format('HH:mm:ss') == '00' ? '00:00:00' : dur.format('HH:mm:ss');

    return result;
  } else {
    let dur = moment.duration(time, 'minutes');

    let result = dur.format('HH:mm:ss') == '00' ? '00:00:00' : dur.format('HH:mm:ss');

    return result;
  }
};

exports.timeSubstract = (a, b) => {
  let durA = moment.duration(a, 'minutes');
  let durB = moment.duration(b, 'minutes');
  let result = durA.subtract(durB);

  return moment.duration(result).format('HH:mm:ss');
};

exports.timeToDuration = time => {
  let dur = moment.duration(time, 'minutes').asMilliseconds();
  return dur;
};
