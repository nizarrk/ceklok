'use strict';

const db = require('../db');

module.exports = input => {
  return db.sequelize
    .query(`SHOW DATABASES LIKE '${process.env.MYSQL_NAME}_${input.toUpperCase()}'`)
    .then(res => {
      return res[0];
    })
    .catch(err => {
      console.log(err);
      return err;
    });
};
