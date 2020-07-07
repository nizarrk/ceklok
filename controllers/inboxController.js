'use strict';

const async = require('async');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');

exports.messageList = (APP, req, callback) => {
  let { inbox, company, admin_app, admin } = APP.models.mysql;
  let { datestart, dateend, name, type, company_id, broadcast, read, limit, offset } = req.body;
  let limitoffset = limit && offset ? `LIMIT ${limit} OFFSET ${offset}` : '';

  async.waterfall(
    [
      function checkParams(callback) {
        if (req.user.level === 1) {
          let params = [
            {
              model: 'inbox',
              db: `${process.env.MYSQL_NAME}`,
              subs: `${process.env.MYSQL_NAME}`,
              status: 'Send',
              level: 1,
              params: `ib.created_by = ${req.user.id}`
            },
            {
              model: 'inbox',
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

          if (type && (type == 1 || type == 2 || type == 3 || type == 4)) {
            params[0].params = `${params[0].params} AND ib.message_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.message_type = ${type}`;
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
              model: 'inbox',
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
              model: 'inbox',
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
              model: 'inbox',
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

          if (type && (type == 1 || type == 2 || type == 3 || type == 4)) {
            params[0].params = `${params[0].params} AND ib.message_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.message_type = ${type}`;
            params[2].params = `${params[2].params} AND ib.message_type = ${type}`;
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
              model: 'inbox',
              db: `${req.user.db}`,
              subs: `${req.user.db}`,
              status: 'Send',
              level: 2,
              params: `ib.created_by = ${req.user.id}`
            },
            {
              model: 'inbox',
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
              model: 'inbox',
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

          if (type && (type == 1 || type == 2 || type == 3 || type == 4)) {
            params[0].params = `${params[0].params} AND ib.message_type = ${type}`;
            params[1].params = `${params[1].params} AND ib.message_type = ${type}`;
            params[2].params = `${params[2].params} AND ib.message_type = ${type}`;
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

      function getInboxData(data, callback) {
        let arr = [];

        Promise.all(
          data.params.map((x, i) => {
            return APP.db.sequelize
              .query(
                `
                SELECT
                  ib.id,
                  ib.broadcast_type,
                  ib.message_type,
                  ib.status_read,
                CASE
                  WHEN ib.message_type = 1 THEN 'System'
                  WHEN ib.message_type = 2 THEN 'Module'
                  WHEN ib.message_type = 3 THEN 'Single'
                  WHEN ib.message_type = 4 THEN 'Broadcast'
                END 
                AS 
                  message_type_name,
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
                  status_read_name,
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

exports.messageDetail = (APP, req, callback) => {
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
                    query: APP.models.mysql.inbox,
                    model: 'inbox',
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
            query: APP.models.company[req.user.db].mysql.inbox,
            model: 'inbox',
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
            ib.broadcast_type,
            ib.message_type,
            ib.status_read,
          CASE
            WHEN ib.message_type = 1 THEN 'System'
            WHEN ib.message_type = 2 THEN 'Module'
            WHEN ib.message_type = 3 THEN 'Single'
            WHEN ib.message_type = 4 THEN 'Broadcast'
          END 
          AS 
            message_type_name,
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
          AND
            (ib.recipient_id = ${req.user.id} OR ib.created_by = ${req.user.id})
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
                data: res[0][0]
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

exports.sendMessage = (APP, req, callback) => {
  let { name, desc, level, recipient_id, message_type, company_id, broadcast_type } = req.body;
  let { company, admin, admin_app } = APP.models.mysql;
  let inbox;

  async.waterfall(
    [
      function checkParam(callback) {
        if (name && desc && level && recipient_id && message_type && broadcast_type) {
          let params = {};
          // admin ceklok
          if (req.user.level === 1) {
            inbox = APP.models.mysql.inbox;
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
            inbox = APP.models.company[req.user.db].mysql.inbox;
            params = {
              id: req.user.company,
              status: 1
            };

            callback(null, params);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'SMQ96',
              message: 'Kesalahan pada parameter user.level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'SMQ96',
            message: 'Kesalahan pada parameter all'
          });
        }
      },

      function checkBroadcastType(data, callback) {
        // single add
        if (broadcast_type == '0') {
          callback(null, {
            params: data,
            broadcast: false
          });
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

      function checkCompany(data, callback) {
        company
          .findAll({
            where: data.params
          })
          .then(res => {
            console.log(res.length);

            if (res.length == 0) {
              callback({
                code: 'INVALID_REQUEST',
                id: 'SMQ96',
                message: 'Company tidak di temukan'
              });
            } else {
              callback(null, {
                broadcast: data.broadcast,
                company: res
              });
            }
          })
          .catch(err => {
            console.log('Error checkCompany', err);
            callback({
              code: 'ERR_DATABASE',
              id: 'SMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( get community )',
              data: err
            });
          });
      },

      function generateCode(data, callback) {
        let kode = APP.generateCode(inbox, 'BM');
        Promise.resolve(kode)
          .then(x => {
            callback(null, {
              broadcast: data.broadcast,
              company: data.company,
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

      function insertMessage(data, callback) {
        if (!data.broadcast) {
          inbox
            .create({
              name: name,
              code: data.code,
              description: desc,
              company_id: company_id,
              recipient_id: recipient_id,
              recipient_level: level,
              sender_level: req.user.level,
              broadcast_type: broadcast_type,
              message_type: message_type,
              created_by: req.user.id
            })
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                id: 'SMP00',
                message: 'Message berhasil disimpan',
                data: res
              });
            })
            .catch(err => {
              console.log(err);
              callback({
                code: 'ERR_DATABASE',
                id: 'SMQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
              });
            });
        } else {
          let arr = [];
          Promise.all(
            data.company.map((x, i) => {
              let { employee } = APP.models.company[`${process.env.MYSQL_NAME}_${x.company_code}`].mysql;
              let query = level == 1 ? admin_app : level == 2 ? admin : level == 3 ? employee : '';

              let params = level == 1 ? {} : level == 2 ? { company_code: x.company_code } : level == 3 ? {} : '';

              return query
                .findAll({
                  where: params
                })
                .then(res => {
                  return res.map((y, i2) => {
                    let obj = {};

                    obj.name = name;
                    obj.code = data.code;
                    obj.description = desc;
                    obj.company_id = x.id;
                    obj.recipient_id = y.id;
                    obj.recipient_level = level;
                    obj.sender_level = req.user.level;
                    obj.broadcast_type = broadcast_type;
                    obj.message_type = message_type;
                    obj.created_by = req.user.id;

                    arr.push(obj);
                  });
                });
            })
          )
            .then(() => {
              if (arr.length == 0) {
                callback({
                  code: 'NOT_FOUND',
                  id: 'SMQ97',
                  message: 'Penerima tidak ditemukan'
                });
              } else {
                inbox
                  .bulkCreate(arr)
                  .then(res => {
                    callback(null, {
                      code: 'INSERT_SUCCESS',
                      id: 'SMP00',
                      message: 'Message berhasil disimpan ( Broadcast )',
                      data: res
                    });
                  })
                  .catch(err => {
                    console.log(err);
                    callback({
                      code: 'ERR_DATABASE',
                      id: 'SMQ98',
                      message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                      data: err
                    });
                  });
              }
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
        }
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};

exports.changeMessageStatus = (APP, req, callback) => {
  let { id, status } = req.body;
  let inbox;

  async.waterfall(
    [
      function checkParams(callback) {
        if ((id && status == '0') || status == '1' || status == '2') {
          if (req.user.level === 1) {
            inbox = APP.models.mysql.inbox;
            callback(null, inbox);
          } else if (req.user.level === 2) {
            inbox = APP.models.company[req.user.db].mysql.inbox;
            callback(null, inbox);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'CSQ96',
              message: 'Kesalahan pada parameter level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'CSQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function updateInbox(inbox, callback) {
        inbox
          .update(
            {
              status: status
            },
            {
              where: {
                id: id
              }
            }
          )
          .then(updated => {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              id: 'CSP00',
              message: 'Status Message berhasil diubah',
              data: updated
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: 'CSQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( update )',
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

exports.deleteMessage = (APP, req, callback) => {
  let { id } = req.body;
  let inbox;

  async.waterfall(
    [
      function checkParam(callback) {
        if (id) {
          if (req.user.level === 1) {
            inbox = APP.models.mysql.inbox;
            callback(null, inbox);
          } else if (req.user.level === 2 || req.user.level === 3) {
            inbox = APP.models.company[req.user.db].mysql.inbox;
            callback(null, inbox);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: 'CSQ96',
              message: 'Kesalahan pada parameter level'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: 'CSQ96',
            message: 'Kesalahan pada parameter'
          });
        }
      },

      function checkSelectedInbox(inbox, callback) {
        inbox
          .findOne({
            where: {
              id: id
            }
          })
          .then(res => {
            if (res == null || res.recipient_id !== req.user.id)
              return callback({
                code: 'NOT_FOUND',
                message: 'Message tidak ditemukan!'
              });

            callback(null, inbox);
          });
      },

      function deleteInbox(inbox, callback) {
        inbox
          .destroy({
            where: {
              id: id
            }
          })
          .then(deleted => {
            callback(null, {
              code: 'DELETE_SUCCESS',
              id: 'DMP00',
              message: 'Delete Message berhasil',
              data: deleted
            });
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'DATABASE_ERR',
              id: 'DMQ98',
              message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( delete )',
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
