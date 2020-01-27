'use strict';

module.exports = async (APP, db, table, prefix) => {
  try {
    let pad = `${prefix}000`;
    let kode = '';

    let res = await APP.db.sequelize.query(`SELECT * FROM ${db}.${table} ORDER BY id DESC LIMIT 1`);

    if (res[0].length == 0) {
      console.log('kosong');
      let str = '' + 1;
      kode = pad.substring(0, pad.length - str.length) + str;

      return kode;
    } else {
      console.log('ada');
      console.log(res[0][0].code);

      let lastID = res[0][0].code;
      let replace = lastID.replace(prefix, '');
      console.log(replace);

      let str = parseInt(replace) + 1;
      kode = pad.substring(0, pad.length - str.toString().length) + str;

      return kode;
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};
