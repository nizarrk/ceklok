'use strict';

module.exports = async (query, prefix) => {
  try {
    let pad = `${prefix}000`;
    let kode = '';

    let res = await query.findAll({
      limit: 1,
      order: [['id', 'DESC']]
    });

    if (res.length == 0) {
      console.log('kosong');
      let str = '' + 1;
      kode = pad.substring(0, pad.length - str.length) + str;

      return kode;
    } else {
      console.log('ada');
      console.log(res[0].code);

      let lastID = res[0].code;
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
