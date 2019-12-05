'use strict';

exports.test = function(APP, req, callback) {
  let tgl = new Date().getDate().toString();
  if (tgl.length == 1) {
    tgl = '0' + new Date().getDate().toString();
  }
  let month = new Date().getMonth() + 1;
  let year = new Date()
    .getFullYear()
    .toString()
    .slice(2, 4);
  let time = year + month + tgl;

  APP.models.mysql.company
    .findOne({
      where: {
        id: 3
      }
    })
    .then(res => {
      let array = res.name.split(' ');
      let code = '';

      array.map(res => {
        code += res[0].toUpperCase();
      });

      let companyCode = code + time + '0'; // 0 is numbering index
      APP.models.mysql.company
        .findAll({
          where: {
            company_code: {
              $like: `${code + time}%`
            }
          },
          limit: 1,
          order: [['id', 'DESC']]
        })
        .then(res => {
          if (res.length == 0) {
            return callback(null, {
              code: 'OK',
              data: companyCode
            });
          } else {
            let lastID = res[0].code_company;
            let replace = lastID.replace(code + time, '');
            let num = parseInt(replace) + 1;

            companyCode = code + time + num;

            return callback(null, {
              code: 'OK',
              data: companyCode
            });
          }
        })
        .catch(err => console.log(err));
    });

  /**
   * YOUR APPLICATION LOGIC HERE...
   */

  // SAMPLE CALLBACK (FINAL RETURN) | SUCCESS

  // SAMPLE CALLBACK (FINAL RETURN) | ERROR
  // callback({
  // 	code: 'ERR'
  // });
};
