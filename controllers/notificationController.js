'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');

exports.companyList = (APP, req, callback) => {
  let { company } = APP.models.mysql;

  company
    .findAll({
      where: {
        status: 1
      }
    })
    .then(res => {
      if (res == null) {
        callback({
          code: 'NOT_FOUND',
          id: '?',
          message: 'Company tidak ditemukan'
        });
      } else {
        callback(null, {
          code: 'FOUND',
          id: '?',
          message: 'Company ditemukan',
          data: res
        });
      }
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        id: '?',
        message: 'Kesalahan pada database',
        data: err
      });
    });
};

exports.recipientList = (APP, req, callback) => {
  let { level, company_id } = req.body;
  let { admin, admin_app, company } = APP.models.mysql;

  async.waterfall(
    [
      function checkparams(callback) {
        if (level) {
          if (level == 1) {
            callback(null, admin_app);
          } else if (level == 2) {
            callback(null, admin);
          } else if (level == 3) {
            if (company_id) {
              company
                .findOne({
                  where: {
                    id: company_id,
                    status: 1
                  }
                })
                .then(res => {
                  if (res == null) {
                    callback({
                      code: 'NOT_FOUND',
                      id: '?',
                      message: 'Company tidak ditemukan'
                    });
                  } else {
                    let { employee } = APP.models.company[`${process.env.MYSQL_NAME}_${res.company_code}`].mysql;

                    callback(null, employee);
                  }
                })
                .catch(err => {
                  console.log(err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: '?',
                    message: 'kesalahan database',
                    data: err
                  });
                });
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '?',
                message: 'Kesalahan pada parameter company_id'
              });
            }
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: '?',
              message: 'Kesalahan pada parameter level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function getData(query, callback) {
        query
          .findAll({
            attributes: ['id', 'name']
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'NOT_FOUND',
                id: '?',
                message: 'Data tidak ditemukan'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                id: '?',
                message: 'Data ditemukan',
                data: res
              });
            }
          });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.notificationList = (APP, req, callback) => {
  let { company } = APP.models.mysql;
  let { datestart, dateend, name, type, company_id, broadcast, read, subtype, limit, offset } = req.body;
  let limitoffset = limit && offset ? `LIMIT ${limit} OFFSET ${offset}` : '';

  async.waterfall(
    [
      function checkParams(callback) {
        if (req.user.level === 1) {
          let params = [
            {
              model: 'notification',
              db: `${process.env.MYSQL_NAME}`,
              subs: `${process.env.MYSQL_NAME}`,
              status: 'Send',
              level: 1,
              params: `ib.created_by = ${req.user.id}`
            },
            {
              model: 'notification',
              db: `${process.env.MYSQL_NAME}`,
              subs: `${process.env.MYSQL_NAME}`,
              status: 'Receive',
              level: 1,
              params: `ib.recipient_id = ${req.user.id} AND ib.status = 1`
            }
          ];
          if (company_id) {
            company
              .findOne({
                where: {
                  id: company_id,
                  status: 1
                }
              })
              .then(res => {
                if (res == null) {
                  callback({
                    code: 'NOT_FOUND',
                    id: '',
                    message: 'Company tidak ditemukan'
                  });
                } else {
                  params[0].params = `${params[0].params} AND ib.company_id = '${company_id}'`;
                  params[1].params = `${params[1].params} AND ib.company_id = '${company_id}'`;
                }
              })
              .catch(err => {
                console.log(err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'LNQ98',
                  message:
                    'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( map data users )',
                  data: err
                });
              });
          }

          if (datestart && dateend) {
            params[0].params = `${params[0].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
            params[1].params = `${params[1].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
          }

          if (name) {
            params[0].params = `${params[0].params} AND ib.name LIKE '%${name}%'`;
            params[1].params = `${params[1].params} AND ib.name LIKE '%${name}%'`;
          }

          if (type && (type == 1 || type == 2)) {
            params[0].params = `${params[0].params} AND ib.notification_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.notification_type = ${type}`;
          }

          if (subtype && (subtype == 1 || subtype == 2 || subtype == 3 || subtype == 4)) {
            params[0].params = `${params[0].params} AND ib.notification_sub_type = ${subtype}`;
            params[1].params = `${params[1].params} AND ib.notification_sub_type = ${subtype}`;
          }

          if (broadcast && (broadcast == 0 || broadcast == 1)) {
            params[0].params = `${params[0].params} AND ib.broadcast_type = ${broadcast}`;
            params[1].params = `${params[1].params} AND ib.broadcast_type = ${broadcast}`;
          }

          if (read && (read == 0 || read == 1)) {
            params[0].params = `${params[0].params} AND ib.status_read = ${read}`;
            params[1].params = `${params[1].params} AND ib.status_read = ${read}`;
          }

          callback(null, params);
        } else if (req.user.level === 2) {
          let params = [
            {
              model: 'notification',
              db: `${req.user.db}`,
              subs: `${req.user.db}`,
              status: 'Send',
              level: 2,
              params: `
                ib.created_by = ${req.user.id} 
              AND
                ib.company_id = '${req.user.company}'
              `
            },
            {
              model: 'notification',
              db: `${req.user.db}`,
              subs: `${req.user.db}`,
              status: 'Receive',
              level: 2,
              params: `
                ib.recipient_id = ${req.user.id}
              AND
                ib.company_id = '${req.user.company}'
              AND
                ib.status = 1
              `
            },
            {
              model: 'notification',
              db: `${process.env.MYSQL_NAME}`,
              subs: `${req.user.db}`,
              status: 'Receive',
              level: 1,
              params: `
                ib.recipient_id = ${req.user.id}
              AND
                ib.company_id = '${req.user.company}'
              AND
                ib.status = 1
            `
            }
          ];

          if (datestart && dateend) {
            params[0].params = `${params[0].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
            params[1].params = `${params[1].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
            params[2].params = `${params[2].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
          }

          if (name) {
            params[0].params = `${params[0].params} AND ib.name LIKE '%${name}%'`;
            params[1].params = `${params[1].params} AND ib.name LIKE '%${name}%'`;
            params[2].params = `${params[2].params} AND ib.name LIKE '%${name}%'`;
          }

          if (type && (type == 1 || type == 2)) {
            params[0].params = `${params[0].params} AND ib.notification_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.notification_type = ${type}`;
            params[2].params = `${params[2].params} AND ib.notification_type = ${type}`;
          }

          if (subtype && (subtype == 1 || subtype == 2 || subtype == 3 || subtype == 4)) {
            params[0].params = `${params[0].params} AND ib.notification_sub_type = ${subtype}`;
            params[1].params = `${params[1].params} AND ib.notification_sub_type = ${subtype}`;
            params[2].params = `${params[2].params} AND ib.notification_sub_type = ${subtype}`;
          }

          if (broadcast && (broadcast == 0 || broadcast == 1)) {
            params[0].params = `${params[0].params} AND ib.broadcast_type = ${broadcast}`;
            params[1].params = `${params[1].params} AND ib.broadcast_type = ${broadcast}`;
            params[2].params = `${params[2].params} AND ib.broadcast_type = ${broadcast}`;
          }

          if (read && (read == 0 || read == 1)) {
            params[0].params = `${params[0].params} AND ib.status_read = ${read}`;
            params[1].params = `${params[1].params} AND ib.status_read = ${read}`;
            params[2].params = `${params[2].params} AND ib.status_read = ${read}`;
          }

          callback(null, params);
        } else if (req.user.level === 3) {
          let params = [
            {
              model: 'notification',
              db: `${req.user.db}`,
              subs: `${req.user.db}`,
              status: 'Send',
              level: 2,
              params: `ib.created_by = ${req.user.id}`
            },
            {
              model: 'notification',
              db: `${req.user.db}`,
              subs: `${req.user.db}`,
              status: 'Receive',
              level: 2,
              params: `
                ib.recipient_id = ${req.user.id}
              AND
                ib.status = 1
              `
            },
            {
              model: 'notification',
              db: `${process.env.MYSQL_NAME}`,
              subs: `${req.user.db}`,
              status: 'Receive',
              level: 1,
              params: `
                ib.recipient_id = ${req.user.id}
              AND
                ib.status = 1
            `
            }
          ];

          if (datestart && dateend) {
            params[0].params = `${params[0].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
            params[1].params = `${params[1].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
            params[2].params = `${params[2].params} AND CONVERT(ib.created_at, date) BETWEEN '${datestart}' AND '${dateend}'`;
          }

          if (name) {
            params[0].params = `${params[0].params} AND ib.name LIKE '%${name}%'`;
            params[1].params = `${params[1].params} AND ib.name LIKE '%${name}%'`;
            params[2].params = `${params[2].params} AND ib.name LIKE '%${name}%'`;
          }

          if (type && (type == 1 || type == 2)) {
            params[0].params = `${params[0].params} AND ib.notification_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.notification_type = ${type}`;
            params[2].params = `${params[2].params} AND ib.notification_type = ${type}`;
          }

          if (subtype && (subtype == 1 || subtype == 2 || subtype == 3 || subtype == 4)) {
            params[0].params = `${params[0].params} AND ib.notification_sub_type = ${subtype}`;
            params[1].params = `${params[1].params} AND ib.notification_sub_type = ${subtype}`;
            params[2].params = `${params[2].params} AND ib.notification_sub_type = ${subtype}`;
          }

          if (broadcast && (broadcast == 0 || broadcast == 1)) {
            params[0].params = `${params[0].params} AND ib.broadcast_type = ${broadcast}`;
            params[1].params = `${params[1].params} AND ib.broadcast_type = ${broadcast}`;
            params[2].params = `${params[2].params} AND ib.broadcast_type = ${broadcast}`;
          }

          if (read && (read == 0 || read == 1)) {
            params[0].params = `${params[0].params} AND ib.status_read = ${read}`;
            params[1].params = `${params[1].params} AND ib.status_read = ${read}`;
            params[2].params = `${params[2].params} AND ib.status_read = ${read}`;
          }

          callback(null, params);
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'LNQ96',
            message: 'Invalid User Level!'
          });
        }
      },

      function countInboxData(data, callback) {
        let total = 0;

        Promise.all(
          data.map((x, i) => {
            return APP.db.sequelize
              .query(
                `
                SELECT
                  COUNT(ib.id) 'total'
                FROM
                  ${x.db}.${x.model} ib
                LEFT OUTER JOIN
                  ceklok.admin_app app 
                ON
                  ib.recipient_id = app.id
                LEFT OUTER JOIN
                  ceklok.admin adm 
                ON
                  ib.recipient_id = adm.id
                LEFT OUTER JOIN
                  ${x.subs}.employee emp 
                ON
                  ib.recipient_id = emp.id
                LEFT OUTER JOIN
                  ceklok.admin_app app1 
                ON
                  ib.created_by = app1.id
                LEFT OUTER JOIN
                  ceklok.admin adm1
                ON
                  ib.created_by = adm1.id
                LEFT OUTER JOIN
                  ${x.subs}.employee emp1 
                ON
                  ib.recipient_id = emp1.id
                LEFT OUTER JOIN
                  ceklok.company comp
                ON
                  ib.company_id = comp.id
                WHERE
                  ${x.params}
                `
              )
              .then(res => {
                console.log(res[0][0].total);

                total += res[0][0].total;
              });
          })
        ).then(() => {
          callback(null, {
            params: data,
            total: total
          });
        });
      },

      function getNotificationData(data, callback) {
        let arr = [];
        Promise.all(
          data.params.map((x, i) => {
            return APP.db.sequelize
              .query(
                `
                SELECT
                  ib.id,
                  ib.notification_type,
                  ib.broadcast_type,
                  ib.status_read,
                  ib.notification_sub_type,
                CASE
                  WHEN ib.notification_sub_type = 1 THEN 'System'
                  WHEN ib.notification_sub_type = 2 THEN 'Module'
                  WHEN ib.notification_sub_type = 3 THEN 'Single'
                  WHEN ib.notification_sub_type = 4 THEN 'Broadcast'
                END 
                AS 
                  notification_sub_type_name,
                  ib.recipient_level,
                CASE
                  WHEN ib.recipient_level = 1 THEN 'Admin CEKLOK'
                  WHEN ib.recipient_level = 2 THEN 'Admin Company'
                  WHEN ib.recipient_level = 3 THEN 'Employee'
                END
                AS
                  recipient_type,
                  ib.recipient_id,
                CASE
                  WHEN ib.recipient_level = 1 THEN app.name
                  WHEN ib.recipient_level = 2 THEN adm.name
                  WHEN ib.recipient_level = 3 THEN emp.name
                END
                AS
                  recipient_name,
                  ib.name,
                  ib.description,
                  ib.created_at,
                  ib.sender_level,
                CASE
                  WHEN ib.sender_level = 1 THEN 'Admin CEKLOK'
                  WHEN ib.sender_level = 1 THEN 'Admin Company'
                  WHEN ib.sender_level = 1 THEN 'Employee'
                END
                AS
                  sender_level_name,
                  ib.created_by,
                CASE
                  WHEN ib.sender_level = 1 THEN app1.name
                  WHEN ib.sender_level = 1 THEN adm1.name
                  WHEN ib.sender_level = 1 THEN emp1.name
                END
                AS
                  created_by_name,
                CASE
                  WHEN ib.recipient_level = 1 THEN 0
                  WHEN ib.recipient_level = 2 THEN ib.company_id
                  WHEN ib.recipient_level = 3 THEN ib.company_id
                END
                AS
                  company_id,
                CASE
                  WHEN ib.recipient_level = 1 THEN null
                  WHEN ib.recipient_level = 2 THEN comp.name
                  WHEN ib.recipient_level = 3 THEN comp.name
                END
                AS
                  company_name,
                CASE
                  WHEN ib.status = 1 THEN 'Active'
                  WHEN ib.status = 0 THEN 'Not Active'
                  WHEN ib.status = 2 THEN 'Not Publish'
                END
                AS
                  status_name,
                CASE
                  WHEN ib.status_read = 0 AND ib.created_by <> ${req.user.id} THEN 'New'
                  WHEN ib.status_read = 1 AND ib.created_by <> ${req.user.id} THEN 'Sudah Read'
                  WHEN ib.status_read = 0 AND ib.created_by = ${req.user.id} THEN 'Belum di Read'
                  WHEN ib.status_read = 1 AND ib.created_by = ${req.user.id} THEN 'Read'
                END
                AS
                  read_status,
                  '${x.status}' AS message_status,
                  ${x.level} AS level_status
                FROM
                  ${x.db}.${x.model} ib
                LEFT OUTER JOIN
                  ceklok.admin_app app 
                ON
                  ib.recipient_id = app.id
                LEFT OUTER JOIN
                  ceklok.admin adm 
                ON
                  ib.recipient_id = adm.id
                LEFT OUTER JOIN
                  ${x.subs}.employee emp 
                ON
                  ib.recipient_id = emp.id
                LEFT OUTER JOIN
                  ceklok.admin_app app1 
                ON
                  ib.created_by = app1.id
                LEFT OUTER JOIN
                  ceklok.admin adm1
                ON
                  ib.created_by = adm1.id
                LEFT OUTER JOIN
                  ${x.subs}.employee emp1 
                ON
                  ib.recipient_id = emp1.id
                LEFT OUTER JOIN
                  ceklok.company comp
                ON
                  ib.company_id = comp.id
                WHERE
                  ${x.params}
                ORDER BY 
                  ib.id DESC
                ${limitoffset}
                `
              )
              .then(res => {
                return res[0].map(y => {
                  arr.push(y);
                });
              });
          })
        ).then(() => {
          if (arr.length == 0) {
            callback({
              code: 'NOT_FOUND',
              id: 'LNQ97',
              message: 'Message Tidak ditemukan'
            });
          } else {
            callback(null, {
              code: 'FOUND',
              id: 'LNP00',
              message: 'Message ditemukan',
              data: {
                total: data.total,
                limit: limit,
                offset: offset,
                rows: arr
              }
            });
          }
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.notificationDetail = (APP, req, callback) => {
  let { id, level, company_id } = req.body;
  let { company } = APP.models.mysql;

  async.waterfall(
    [
      function checkParams(callback) {
        if (level == 1) {
          if (company_id) {
            company
              .findOne({
                where: { id: company_id }
              })
              .then(res => {
                if (res == null) {
                  callback({
                    code: 'NOT_FOUND',
                    id: 'DMQ97',
                    message: 'Company Tidak ditemukan'
                  });
                } else {
                  callback(null, {
                    query: APP.models.mysql.notification,
                    model: 'notification',
                    db: `${process.env.MYSQL_NAME}`,
                    subs: `${process.env.MYSQL_NAME}_${res.company_code}`
                  });
                }
              });
          } else {
            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter company_id!'
            });
          }
        } else if (level == 2) {
          callback(null, {
            query: APP.models.company[req.user.db].mysql.notification,
            model: 'notification',
            db: req.user.db,
            subs: req.user.db
          });
        } else {
          callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter level!'
          });
        }
      },

      function updateStatusRead(data, callback) {
        data.query
          .update(
            {
              status_read: 1
            },
            {
              where: {
                id: id,
                recipient_id: req.user.id
              }
            }
          )
          .then(() => {
            callback(null, data);
          })
          .catch(err => {
            console.log('Error update', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'DNQ98',
              message:
                'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( update read status inbox )',
              data: err
            });
          });
      },

      function getDetails(data, callback) {
        return APP.db.sequelize
          .query(
            `
          SELECT
            ib.id,
            ib.notification_type,
            ib.broadcast_type,
            ib.status_read,
            ib.notification_sub_type,
          CASE
            WHEN ib.notification_sub_type = 1 THEN 'System'
            WHEN ib.notification_sub_type = 2 THEN 'Module'
            WHEN ib.notification_sub_type = 3 THEN 'Single'
            WHEN ib.notification_sub_type = 4 THEN 'Broadcast'
          END 
          AS 
            notification_sub_type_name,
            ib.recipient_level,
          CASE
            WHEN ib.recipient_level = 1 THEN 'Admin CEKLOK'
            WHEN ib.recipient_level = 2 THEN 'Admin Company'
            WHEN ib.recipient_level = 3 THEN 'Employee'
          END
          AS
            recipient_type,
            ib.recipient_id,
          CASE
            WHEN ib.recipient_level = 1 THEN app.name
            WHEN ib.recipient_level = 2 THEN adm.name
            WHEN ib.recipient_level = 3 THEN emp.name
          END
          AS
            recipient_name,
            ib.name,
            ib.description,
            ib.created_at,
            ib.sender_level,
          CASE
            WHEN ib.sender_level = 1 THEN 'Admin CEKLOK'
            WHEN ib.sender_level = 1 THEN 'Admin Company'
            WHEN ib.sender_level = 1 THEN 'Employee'
          END
          AS
            sender_level_name,
            ib.created_by,
          CASE
            WHEN ib.sender_level = 1 THEN app1.name
            WHEN ib.sender_level = 1 THEN adm1.name
            WHEN ib.sender_level = 1 THEN emp1.name
          END
          AS
            created_by_name,
          CASE
            WHEN ib.recipient_level = 1 THEN 0
            WHEN ib.recipient_level = 2 THEN ib.company_id
            WHEN ib.recipient_level = 3 THEN ib.company_id
          END
          AS
            company_id,
          CASE
            WHEN ib.recipient_level = 1 THEN null
            WHEN ib.recipient_level = 2 THEN comp.name
            WHEN ib.recipient_level = 3 THEN comp.name
          END
          AS
            company_name,
          CASE
            WHEN ib.status = 1 THEN 'Active'
            WHEN ib.status = 0 THEN 'Not Active'
            WHEN ib.status = 2 THEN 'Not Publish'
          END
          AS
            status_name,
          CASE
            WHEN ib.created_by =  '${req.user.id}' THEN 'Send'
            WHEN ib.created_by <> '${req.user.id}' THEN 'Receive'
          END
          AS
            message_status,
          CASE
            WHEN ib.status_read = 0 AND ib.created_by <> ${req.user.id} THEN 'New'
            WHEN ib.status_read = 1 AND ib.created_by <> ${req.user.id} THEN 'Sudah Read'
            WHEN ib.status_read = 0 AND ib.created_by = ${req.user.id} THEN 'Belum di Read'
            WHEN ib.status_read = 1 AND ib.created_by = ${req.user.id} THEN 'Read'
          END
          AS
            read_status,
            ${level} AS level_status
          FROM
            ${data.db}.${data.model} ib
          LEFT OUTER JOIN
            ceklok.admin_app app 
          ON
            ib.recipient_id = app.id
          LEFT OUTER JOIN
            ceklok.admin adm 
          ON
            ib.recipient_id = adm.id
          LEFT OUTER JOIN
            ${data.subs}.employee emp 
          ON
            ib.recipient_id = emp.id
          LEFT OUTER JOIN
            ceklok.admin_app app1 
          ON
            ib.created_by = app1.id
          LEFT OUTER JOIN
            ceklok.admin adm1
          ON
            ib.created_by = adm1.id
          LEFT OUTER JOIN
            ${data.subs}.employee emp1 
          ON
            ib.recipient_id = emp1.id
          LEFT OUTER JOIN
            ceklok.company comp
          ON
            ib.company_id = comp.id
          WHERE
            ib.id = ${id}
          `
          )
          .then(res => {
            if (res[0].length == 0) {
              callback({
                code: 'NOT_FOUND',
                id: 'DNQ97',
                message: 'Data Tidak ditemukan'
              });
            } else {
              callback(null, {
                code: 'FOUND',
                id: 'DN00',
                message: 'Data ditemukan',
                data: res[0]
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: 'DNQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get inbox )',
              data: err
            });
          });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.sendNotification = (APP, req, callback) => {
  let { name, desc, level, recipient_id, type, company_id, notif_type, email, url, broadcast_type } = req.body;
  let { company, admin, admin_app } = APP.models.mysql;
  let notification;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && level && type && notif_type && broadcast_type) {
          let params = {};
          // admin ceklok
          if (req.user.level === 1) {
            notification = APP.models.mysql.notification;
            if (company_id) {
              params = {
                id: company_id,
                status: 1
              };

              callback(null, params);
            } else {
              params = {
                status: 1
              };

              callback(null, params);
            }
            // admin company
          } else if (req.user.level === 2) {
            notification = APP.models.company[req.user.db].mysql.notification;
            params = {
              id: req.user.company,
              status: 1
            };

            callback(null, params);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'SNQ96',
              message: 'Kesalahan pada parameter user.level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SNQ96',
            message: 'Kesalahan pada parameter all'
          });
        }
      },

      function checkBroadcastType(data, callback) {
        // single add
        if (broadcast_type == '0') {
          if (recipient_id) {
            callback(null, {
              params: data,
              broadcast: false
            });
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'SMQ96',
              message: 'Kesalahan pada parameter recipient_id'
            });
          }
          //broadast add
        } else if (broadcast_type == '1') {
          callback(null, {
            params: data,
            broadcast: true
          });
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SMQ96',
            message: 'Kesalahan pada parameter broadcast_type'
          });
        }
      },

      function checkNotifType(data, callback) {
        // push notif
        if (notif_type == 1) {
          callback(null, {
            params: data.params,
            broadcast: data.broadcast,
            type: true
          });
          // mail
        } else if (notif_type == 2) {
          callback(null, {
            params: data.params,
            broadcast: data.broadcast,
            type: false
          });
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SMQ96',
            message: 'Kesalahan pada parameter notif_type'
          });
        }
      },

      function checkCompany(data, callback) {
        company
          .findAll({
            attributes: ['id', 'company_code'],
            where: data.params
          })
          .then(res => {
            if (res.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SNQ97',
                message: 'Company tidak di temukan'
              });
            } else {
              callback(null, {
                broadcast: data.broadcast,
                type: data.type,
                company: res
              });
            }
          })
          .catch(err => {
            console.log('Error checkCompany', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'SNQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
              data: err
            });
          });
      },

      function checkRecipientEmail(data, callback) {
        let arr = [];
        Promise.all(
          data.company.map(x => {
            let query =
              level == 1
                ? admin_app
                : level == 2
                ? admin
                : level == 3
                ? APP.models.company[`${process.env.MYSQL_NAME}_${x.company_code}`].mysql.employee
                : callback({
                    code: 'INVALID_REQUEST',
                    id: 'SMQ96',
                    message: 'Kesalahan pada parameter level'
                  });

            let params =
              level == 1
                ? { status: 1 }
                : level == 2
                ? { company_code: x.company_code, status: 1 }
                : level == 3
                ? { company_code: x.company_code, status: 1 }
                : callback({
                    code: 'INVALID_REQUEST',
                    id: 'SMQ96',
                    message: 'Kesalahan pada parameter level'
                  });

            return query
              .findAll({
                attributes: ['id', 'email'],
                where: params
              })
              .then(res => {
                return res.map(y => {
                  let obj = {};

                  obj.recipient_id = y.id;
                  obj.company_id = x.id;
                  obj.email = y.email;

                  arr.push(obj);
                });
              })
              .catch(err => {
                console.log('Error checkRecipientEmail', err);
                callback({
                  code: 'ERR_DATABASE',
                  id: 'SNQ98',
                  message:
                    'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
                  data: err
                });
              });
          })
        )
          .then(() => {
            if (arr.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SNQ97',
                message: 'Email tidak di temukan'
              });
            } else {
              callback(null, {
                broadcast: data.broadcast,
                type: data.type,
                company: data.company,
                arr: arr
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'SNP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(notification, 'N');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              broadcast: data.broadcast,
              type: data.type,
              company: data.company,
              arr: data.arr,
              code: x
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              id: 'SMP01',
              message: 'Terjadi Kesalahan, mohon coba kembali',
              data: err
            });
          });
      },

      function insertNotification(data, callback) {
        if (!data.broadcast) {
          notification
            .create({
              name: name,
              code: data.code,
              description: desc,
              email: data.arr[0].email,
              url: url,
              company_id: company_id,
              recipient_id: recipient_id,
              recipient_level: level,
              sender_level: req.user.level,
              notification_type: notif_type,
              notification_sub_type: type,
              created_by: req.user.id
            })
            .then(res => {
              callback(null, res);
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SNQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        } else {
          let email = [];

          Promise.all(
            data.arr.map(x => {
              let obj = {};

              obj.name = name;
              obj.code = data.code;
              obj.description = desc;
              obj.email = x.email;
              obj.url = url;
              obj.company_id = x.company_id;
              obj.recipient_id = x.recipient_id;
              obj.recipient_level = level;
              obj.sender_level = req.user.level;
              obj.broadcast_type = broadcast_type;
              obj.notification_type = notif_type;
              obj.notification_sub_type = type;
              obj.created_by = req.user.id;

              email.push(x.email);
              return obj;
            })
          )
            .then(arr => {
              notification
                .bulkCreate(arr)
                .then(res => {
                  callback(null, {
                    type: data.type,
                    arr: res,
                    email: email
                  });
                })
                .catch(err => {
                  console.log('Error bulkCreate', err);
                  callback({
                    code: 'ERR_DATABASE',
                    id: 'SNQ98',
                    message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                    data: err
                  });
                });
            })
            .catch(err => {
              console.log('Error .map insertNotification', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SNQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        }
      },

      //tinggal tes mau pake push atau mail
      function pushNotifOrsendMail(data, callback) {
        try {
          //push
          if (data.type) {
            callback({
              code: 'INSERT_SUCCESS',
              id: 'SNP00',
              message: 'Notifikasi berhasil dikirimkan (tapi push belum dicoba, frontend belum ya!)',
              data: data
            });
            //mail
          } else {
            APP.mailer.sendMail({
              subject: name,
              to: data.email,
              data: {
                data: data
              },
              file: 'notification.html'
            });

            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'SNP00',
              message: 'Notifikasi berhasil dikirimkan',
              data: data
            });
          }
        } catch (err) {
          console.log(err);
          callback({
            code: 'ERR',
            id: 'SNP01',
            message: 'Terjadi Kesalahan, mohon coba kembali',
            data: err
          });
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.notificationSettings = (APP, req, callback) => {
  if (req.user.level === 1) {
    let { notification_setting_master } = APP.models.mysql;
    let { settings } = req.body;

    if (!settings) {
      callback({
        code: 'INVALID_REQUEST',
        id: 'NSQ96',
        message: 'Kesalahan pada parameter'
      });
    } else {
      Promise.all(
        settings.map((x, index) => {
          let obj = {};

          obj.name = settings[index].name;
          obj.description = settings[index].desc;

          return obj;
        })
      ).then(arr => {
        notification_setting_master
          .bulkCreate(arr)
          .then(res => {
            callback(null, {
              code: 'INSERT_SUCCESS',
              id: 'NSP00',
              message: 'Setting notification berhasil diubah',
              data: res
            });
          })
          .catch(err => {
            console.log('Error addSetting', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'NSQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
              data: err
            });
          });
      });
    }
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};

exports.notificationSettingsCompany = (APP, req, callback) => {
  if (req.user.level === 2) {
    let { notification_setting_master } = APP.models.mysql;
    let { notification_setting } = APP.models.company[req.user.db].mysql;
    let { type, value } = req.body;

    async.waterfall(
      [
        function checkParam(callback) {
          if (type && value) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'NSQ96',
              message: 'Kesalahan pada parameter'
            });
          }
        },

        function checknotificationType(data, callback) {
          notification_setting_master
            .findOne({
              where: {
                id: type
              }
            })
            .then(res => {
              if (res == null) {
                return callback({
                  code: 'NOT_FOUND',
                  message: 'notification_setting_master tidak ditemukan'
                });
              }
              callback(null, true);
            })
            .catch(err => {
              console.log('Error checknotificationType', err);
              callback({
                code: 'ERR_DATABASE',
                message: 'Error checknotificationType',
                data: err
              });
            });
        },

        function addSettings(data, callback) {
          notification_setting
            .create({
              notification_setting_id: type,
              value: value
            })
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                id: 'NSP00',
                message: 'Setting notification berhasil diubah',
                data: res
              });
            })
            .catch(err => {
              console.log('Error addSetting', err);
              callback({
                code: 'ERR_DATABASE',
                id: 'NSQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        }
      ],
      (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(null, result);
      }
    );
  } else {
    callback({
      code: 'INVALID_REQUEST',
      id: '?',
      message: 'Invalid user level'
    });
  }
};
