'use strict';

//const validateJS = require('validate.js');
const xss = require('xss');

exports.email = str => {
  return str == '' ||
    str.length < 2 ||
    str == undefined ||
    (str && typeof str !== 'string') ||
    (str &&
      !/^(([^<>()[\].,;:\s@"]+(.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(
        str
      ))
    ? { code: 'INVALID_REQUEST', message: 'Kesalahan pada parameter email' }
    : true;
};

exports.username = str => {
  return str == '' ||
    str.length < 2 ||
    str == undefined ||
    (str && typeof str !== 'string') ||
    (str && / /g).test(str) ||
    (str && str.length > 50)
    ? { code: 'INVALID_REQUEST', message: 'Kesalahan pada parameter username' }
    : true;
};

exports.password = str => {
  return str == '' ||
    str.length < 8 ||
    str == undefined ||
    (str && typeof str !== 'string') ||
    (str && / /g).test(str) ||
    (str && str.length > 50) ||
    str.search(/\d/) == -1 ||
    str.search(/[a-zA-Z]/) == -1
    ? { code: 'INVALID_REQUEST', message: 'Kesalahan pada parameter password' }
    : true;
};

exports.rawQueryCheck = str => {
  if (typeof str === 'string') {
    return str.replace(/[\\"*&-+`.,;:]/g, "'\\''");
  } else {
    return str;
  }
};

exports.checkCSV = str => {
  let riskyChars = ['&', '=', '+', '-', '@'];

  if (!str) return '';

  const firstChar = str.charAt(0);
  const isInjected = riskyChars.includes(firstChar);

  if (!isInjected) return str;

  const slicedStr = str.slice(1);

  return slicedStr;
};

exports.xss = str => {
  let filter = xss(str);

  return filter;
};

// exports.array = (arr) => {
// 	return (!validateJS.isArray(arr)) ? { code: 'INVALID_REQUEST', info: { invalidArray: arr } : true;
// };
