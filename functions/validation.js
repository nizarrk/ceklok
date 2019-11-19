'use strict';

//const validateJS = require('validate.js');

exports.email = str => {
  return str == '' ||
    str.length < 2 ||
    str == undefined ||
    (str && typeof str !== 'string') ||
    (str &&
      !/^(([^<>()[\].,;:\s@"]+(.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(
        str
      ))
    ? { code: 'INVALID_REQUEST', info: { invalidParameter: 'email' } }
    : true;
};

exports.username = str => {
  return str == '' ||
    str.length < 2 ||
    str == undefined ||
    (str && typeof str !== 'string') ||
    (str && / /g).test(str) ||
    (str && str.length > 50)
    ? { code: 'INVALID_REQUEST', info: { invalidParameter: 'username' } }
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
    ? { code: 'INVALID_REQUEST', info: { invalidParameter: 'password' } }
    : true;
};

// exports.array = (arr) => {
// 	return (!validateJS.isArray(arr)) ? { code: 'INVALID_REQUEST', info: { invalidArray: arr } } : true;
// };
