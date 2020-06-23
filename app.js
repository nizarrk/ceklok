'use strict';

// Your active environment.
require('env2')('.env');

const events = require('events');

events.EventEmitter.prototype._maxListeners = 100;
events.EventEmitter.defaultMaxListeners = 100;

const fs = require('fs');
const async = require('async');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const trycatch = require('trycatch');
const path = require('path');
const moment = require('moment');
const ip = require('ip');
const msisdn = require('express-msisdn');
const randomString = require('crypto-random-string');
const presence = require('./controllers/presenceController');
const cors = require('cors');
const schedule = require('node-schedule');
const csurf = require('csurf-expire');
const cookieParser = require('cookie-parser');

// Your Database configurations.
const db = require('./db.js');

// Your route setup.
const routes = require('./routes.json');

// Your messages.json.
let messages = {};
trycatch(
  () => {
    messages = require('./messages.json');
  },
  err => {
    if (err) console.log('[WARN] Not using any error message mapping');
  }
);

// Initialize `APP` object.
const app = express();
let APP = {};
APP.db = db;
APP.ip = ip;

app.use(cors());

const fileUpload = require('express-fileupload');
// default options
app.use(
  fileUpload({
    createParentPath: true
  })
);

// add msisdn middleware
app.use(msisdn());

app.use(cookieParser());

/**
 * ExpressJS basic middlewares.
 */
if (process.env.JSON_REQUEST === 'true') {
  app.use((req, res, next) => {
    bodyParser.json({ limit: process.env.JSON_REQUEST_LIMIT })(req, res, err => {
      if (err) {
        let params = {
          code: 'INVALID_REQUEST',
          message: 'Error parsing JSON request',
          info: err
        };
        return resOutput(APP, req, res, params, 'err');
      }
      next();
    });
  });
}
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan(process.env.LOG_ENV));

/**
 * @Application functions.
 */

// Models.
function modelObj(db, callback) {
  async.parallel(
    [
      function getSequelizeModel(callback) {
        if (process.env.MYSQL !== 'true') return callback(null, {});

        fs.readdir(__dirname + '/models', (err, files) => {
          let x = [];
          files.map(model => {
            if (model.match('.js')) x.push(model);
          });

          let len = x.length;

          if (len < 1) return callback(null, {});

          let n = 1;
          let models = {};

          x.map(model => {
            let Model = db.sequelize.import('./models/' + model);
            let modelName = model.replace('.js', '');

            models[modelName] = Model;

            if (n === len) {
              let mysqls = {};

              Object.keys(models).forEach(val => {
                if (models[val].associate) models[val].associate(models);

                mysqls[val] = models[val];
              });

              callback(null, mysqls);
            }

            n++;
          });
        });
      },
      function getSequelizeTemplateModel(callback) {
        if (process.env.MYSQL !== 'true') return callback(null, {});

        fs.readdir(__dirname + '/models/template', (err, files) => {
          db.sequelize.query('SELECT * FROM company WHERE payment_status = 1').then(res => {
            let models = {};
            let mysqls = {};

            if (res[0].length > 0) {
              let z = 1;
              res[0].map(result => {
                let dbName = 'ceklok_' + result.company_code;
                models[dbName] = { mysql: {} };

                let x = [];
                files.map(model => {
                  if (model.match('.js')) x.push(model);
                });

                let len = x.length;

                if (len < 1) return callback(null, {});

                let n = 1;

                x.map(model => {
                  let Model = db.customSequelize(dbName).import('./models/template/' + model);
                  let modelName = model.replace('.js', '');

                  models[dbName].mysql[modelName] = Model;

                  if (n === len) {
                    Object.keys(models).forEach(val => {
                      if (models[val].associate) models[val].associate(models);

                      mysqls[val] = models[val];
                    });
                  }

                  n++;
                });

                if (z === res[0].length) {
                  callback(null, mysqls);
                }
                z++;
              });
            } else {
              callback(null);
            }
          });
        });
      },
      function getMongooseModel(callback) {
        if (process.env.MONGO !== 'true') return callback(null, {});

        fs.readdir(__dirname + '/models/mongo', (err, files) => {
          let x = [];

          files.map(model => {
            if (model.match('.js')) x.push(model);
          });

          let len = x.length;

          if (len < 1) return callback(null, {});

          let n = 1;
          let models = {};

          x.map(model => {
            let Model = require('./models/mongo/' + model);
            let modelName = model.replace('.js', '');

            models[modelName] = Model(db.mongo);

            if (n === len) return callback(null, models);

            n++;
          });
        });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      let models = {};
      models.mysql = result[0];
      models.company = result[1];
      models.mongo = result[2];

      return callback(null, models);
    }
  );
}

// Req & Res logging
function resLog(APP, req, callback) {
  if (process.env.MONGO !== 'true') return callback(null, true);

  let logModel = {};

  if (db.mongo.models._logs) {
    logModel = db.mongo.models._logs;
  } else {
    logModel = db.mongo.model(
      '_logs',
      db.mongo.Schema({
        endpoint: String,
        request: String,
        response: String,
        status: String,
        date: Date,
        time: String,
        elapsed_time: String
      })
    );
  }

  logModel.create(req.body, err => {
    if (err) return callback(err);

    return callback(null, true);
  });
}

// Response output.
function resOutput(APP, req, res, params, status) {
  let output = {};

  async.waterfall(
    [
      function generateMessage(callback) {
        let message = {
          company: {}
        };

        if (messages[params.code]) message.company = messages[params.code];

        output.name = params.name || message.company.name;
        output.code = params.id || message.company.id;
        output.status = params.status || message.company.status;
        output.error = params.error || message.company.error;
        output.message = params.message || message.company.message;
        output.data = params.data || message.company.data;
        output.debug = undefined;

        if (process.env.NODE_ENV !== 'production') {
          if (message.company.error !== false) {
            output.debug = {
              from: params.from || process.env.SERVICE_NAME || message.company.from,
              info: params.info || message.company.info
            };
          }
        }

        if (process.env.APP_MESSAGE !== 'true') output = params;
        callback(null, message);
      },
      function logging(message, callback) {
        req.elapsedTime = new Date().getTime() - req.startTime;

        db.sequelize.models.endpoint
          .findOne({
            where: {
              endpoint: req.originalUrl
            }
          })
          .then(row => {
            let profile =
              row == null || row.auth == 0
                ? {
                    id: 0,
                    code: 0,
                    level: 0
                  }
                : req.user;

            resLog(
              APP,
              {
                body: {
                  request: req.body ? JSON.stringify(req.body) : null,
                  response: output ? JSON.stringify(output) : null,
                  status: message.company.status || 200,
                  ip: ip.address(),
                  // req.connection.remoteAddress === '::1'
                  //   ? '127.0.0.1'
                  //   : req.connection.remoteAddress.replace('::', '').replace('ffff:', ''),
                  feature_id: row !== null ? row.feature_id : '',
                  subfeature_id: row !== null ? row.subfeature_id : '',
                  endpoint: req.originalUrl,
                  user_id: profile.id,
                  level: profile.level,
                  company: profile.code,
                  date: req.customDate,
                  time: req.customTime,
                  elapsed_time: req.elapsedTime || '0'
                }
              },
              err => {
                if (err) console.log(err);
                callback(null, message);
              }
            );
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR',
              data: err
            });
          });
      },
      function printing(message, callback) {
        if (process.env.APP_LOG !== 'true') return callback(null, message);

        //Limit request/response logging print character
        let request = req.body
          ? JSON.stringify(req.body).length > 3000
            ? JSON.stringify(req.body).substr(0, 3000) + ' ...(Selengkapnya di Log Mongo)'
            : JSON.stringify(req.body)
          : '';
        let response = output
          ? JSON.stringify(output).length > 3000
            ? JSON.stringify(output).substr(0, 3000) + ' ...(Selengkapnya di Log Mongo)'
            : JSON.stringify(output)
          : '';

        if (status === 'err') {
          console.error('\n==========================================================');
          console.error('STATUS       : ERROR');
          console.error('IP           : ' + ip.address());
          console.error('ENDPOINT     : ' + req.originalUrl);
          console.error('TIMESTAMP    : ' + req.customDate);
          console.error('PROCESS TIME : ' + (req.elapsedTime || '0') + ' ms');
          console.error('====================== REQUEST ===========================');
          console.error(request + '\n');
          console.error('====================== RESPONSE ==========================');
          console.error(response + '\n');
          console.error('==========================================================');
          // console.log(res.cookie());
        } else {
          console.log('\n==========================================================');
          console.log('STATUS       : OK');
          console.log('IP           : ' + ip.address());
          console.log('ENDPOINT     : ' + req.originalUrl);
          console.log('TIMESTAMP    : ' + req.customDate);
          console.log('PROCESS TIME : ' + (req.elapsedTime || '0') + ' ms');
          console.log('====================== REQUEST ===========================');
          console.log(request + '\n');
          console.log('====================== RESPONSE ==========================');
          console.log(response + '\n');
          console.log('==========================================================');
          // console.log(res.cookie());
        }

        callback(null, message);
      }
    ],
    (err, message) => {
      trycatch(
        () => {
          if (res === false) {
            return console.log('CRON Logged Successfully!');
          } else {
            console.log('sukses bukan cron');

            if (process.env.JSON_RESPONSE !== 'true')
              return res.status(params.status || message.company.status || 200).send(output);
            return res.status(params.status || message.company.status || 200).json(output);
          }
        },
        err => {
          if (res === false) {
            return console.log('CRON Failed to Log!', err);
          } else {
            console.log('error bukan cron', err);
            if (process.env.JSON_RESPONSE !== 'true')
              return res.status(params.status || message.company.status || 200).send(output);
            return res.status(params.status || message.company.status || 200).json(output);
          }
        }
      );
    }
  );
}

/**
 * @Application registrar.
 */
async.series(
  [
    /**
     * This will register all of your functions from `/functions` directory into `APP` object,
     * so you can use them through the object directly without calling `require` anymore.
     *
     * Just make sure you pass the `APP` object on
     * every single function you made. Basicly, you'll need to do that on and from the controller.
     * The Controller of course, must has every arguments you need, and it did (see the `exampleController`).
     */
    function initializeAPPFunctions(callback) {
      fs.readdir('./functions', (err, files) => {
        let len = files.length;
        let lenX = len - 1;
        let n = 0;

        files.map(func => {
          if (func.match('.js')) {
            APP[func.replace('.js', '')] = require('./functions/' + func);

            if (n === lenX) return callback(null, true);
          }

          n++;
        });
      });
    },

    /**
     * This will register all of your models from `/models` directory into `APP` object,
     * so you can use them through the object directly without calling `require` anymore.
     *
     * Just make sure you pass the `APP` object on
     * every single function you made. Basicly, you'll need to do that on and from the controller.
     * The Controller of course, must has every arguments you need, and it did (see the `exampleController`).
     */
    function initializeAPPModels(callback) {
      modelObj(db, (err, result) => {
        if (err) return callback(err);

        APP.models = result;

        callback(null, true);
      });
    }
  ],
  () => {
    app.use((req, res, next) => {
      let tgl = new Date().getDate().toString();
      if (tgl.length == 1) {
        tgl = '0' + new Date().getDate().toString();
      }
      let month = new Date().getMonth() + 1;
      let year = new Date().getFullYear().toString();

      req.currentDate = new Date(`${year}-${month}-${tgl}`);
      req.customDate = new Date();
      req.customTime = moment()
        .format('HH:mm:ss')
        .toUpperCase();
      req.customTimestamp = moment()
        .format('YYYY-MM-DD HH:mm:ss')
        .toUpperCase();
      req.startTime = new Date().getTime();
      req.connection.remoteAddress === '::1'
        ? (req.ipClient = '127.0.0.1')
        : req.connection.remoteAddress === undefined
        ? (req.ipClient = '127.0.0.1')
        : (req.ipClient = req.connection.remoteAddress.replace('::', '').replace('ffff:', ''));
      req.randomString = randomString({ length: 64 });
      req.randomNumber = randomString({ length: 16, characters: '1234567890' });
      req.otp = randomString({ length: 6, characters: '1234567890' });

      next();
    });

    // Assuming endpoint `/` as an unwanted service.
    app.all('/', (req, res) => {
      return resOutput(
        APP,
        req,
        res,
        {
          code: '00',
          message: 'Hello World!'
        },
        'ok'
      );
    });

    // CRON GENERATE DAILY ABSENCE
    let rule = new schedule.RecurrenceRule();
    // rule.dayOfWeek = [0, 6];
    rule.hour = [1, 2, 3, 4, 5];
    rule.minute = 5;
    schedule.scheduleJob(rule, function() {
      // console.log(rule.hour);
      db.sequelize
        .query('SELECT company_code FROM ceklok.company WHERE status = 1')
        .then(res => {
          Promise.all(
            res[0].map((x, i) => {
              let arr = rule.minute;
              console.log(`Looping ke: ${i}`);
              console.log(`Company: ${x.company_code}`);

              return db.sequelize
                .query(
                  `
                SELECT 
                  value 
                FROM 
                  ${process.env.MYSQL_NAME}_${x.company_code}.presence_setting 
                WHERE
                  presence_setting_id = 2
                `
                )
                .then(res => {
                  let result = rule.hour.filter(x => x == res[0][0].value);

                  if (result.length > 0 && new Date().getHours() === result[0]) {
                    console.log(result);
                    console.log(`Company: ${x.company_code}`);

                    return presence.generateDailyPresence(
                      APP,
                      {
                        body: {
                          company: x.company_code
                        }
                      },
                      (err, result) => {
                        if (err)
                          return resOutput(
                            APP,
                            {
                              body: {
                                company: x.company_code
                              },
                              originalUrl: '/presence/generatepresence',
                              customDate: new Date()
                            },
                            false,
                            err,
                            'err'
                          );

                        return resOutput(
                          APP,
                          {
                            body: {
                              company: x.company_code
                            },
                            originalUrl: '/presence/generatepresence',
                            customDate: new Date()
                          },
                          false,
                          result,
                          'ok'
                        );
                      }
                    );
                  }
                })
                .catch(err => {
                  console.log('Query Get Value Failed!', err);
                });
            })
          )
            .then(() => {
              console.log('CRON Successfully Executed!');
            })
            .catch(err => {
              console.log('CRON Failed!', err);
            });
        })
        .catch(err => {
          console.log('Query Active Company Failed!', err);
        });
    });

    /**
     * This will register all of your routes from `routes.json` file,
     * so you don't need to re-define their object instance anymore.
     */
    const keys = Object.keys(routes);
    const len = keys.length - 1;
    let n = 0;

    keys.map(endpoint => {
      app.use(endpoint, (req, res, next) => {
        if (req.body) {
          if (req.headers['content-type'] === 'application/json') {
            if (req.headers['encrypt'] && req.headers['encrypt'] == 'true' && req.body.data) {
              console.log('enkrip broooo');
              let decrypt = require('./functions/rsa').decrypt(req.body.data);

              if (typeof decrypt == 'string') {
                req.body = JSON.parse(decrypt);
              } else {
                req.body = decrypt;
              }

              console.log(req.body);
            }
          }
        }
        next();
      });

      //<----- CSRF CONFIG ----->
      app.use(
        endpoint,
        csurf({
          cookie: {
            maxAge: 7200 // 2 hours
          }
        })
      );

      // app.use(endpoint, (req, res, next) => {
      //   res.cookie('XSRF-TOKEN', req.csrfToken());
      //   res.locals.csrftoken = req.csrfToken();
      //   next();
      // });

      app.use(endpoint, (err, req, res, next) => {
        if (err.code != 'EBADCSRFTOKEN') return next(err);
        if (routes[endpoint].csrf !== false) {
          if (req.headers['platform'] == 'Mobile') return next();

          // handle CSRF token errors here
          res.status(403).send({
            code: '01',
            status: 403,
            from: '',
            info: {},
            message: err.message,
            error: true
          });
        } else {
          next();
        }
      });

      //<----- END CSRF CONFIG ----->

      if (routes[endpoint].auth) {
        app.use(endpoint, require('./functions/verifyToken'));

        app.use(endpoint, (req, res, next) => {
          if (req.headers.authorization) {
            if (routes[endpoint].level == 4) {
              console.log('masuk level 4');
              if (req.user.level == 2 || req.user.level == 3) {
                console.log('masuk level 2 3');
                next();
              } else {
                console.log('level token tidak valid!');
                res.status(401).send({
                  code: '01',
                  status: 401,
                  message: 'Level token tidak sesuai!',
                  error: true
                });
              }
            } else if (routes[endpoint].level == 5) {
              console.log('masuk level 5');
              if (req.user.level == 1 || req.user.level == 2) {
                console.log('masuk level 1 2');
                next();
              } else {
                console.log('level token tidak valid!');
                res.status(401).send({
                  code: '01',
                  status: 401,
                  message: 'Level token tidak sesuai!',
                  error: true
                });
              }
            } else if (routes[endpoint].level == 0) {
              console.log('masuk level 0');
              if (req.user.level == 1 || req.user.level == 2 || req.user.level == 3) {
                console.log('masuk level 1 2 3');
                next();
              } else {
                console.log('level token tidak valid!');
                res.status(401).send({
                  code: '01',
                  status: 401,
                  message: 'Level token tidak sesuai!',
                  error: true
                });
              }
            } else if (routes[endpoint].level == 1 || routes[endpoint].level == 2 || routes[endpoint].level == 3) {
              console.log('masuk level 1 2 3');
              if (req.user.level == routes[endpoint].level) {
                console.log('level token valid!');
                next();
              } else {
                console.log('level token tidak valid!');
                res.status(401).send({
                  code: '01',
                  status: 401,
                  message: 'Level token tidak sesuai!',
                  error: true
                });
              }
            } else {
              console.log('tidak masuk level manapun');

              console.log('level token tidak valid!');
              res.status(401).send({
                code: '01',
                status: 401,
                message: 'Level token tidak sesuai!',
                error: true
              });
            }
          }
        });
      }
      app[routes[endpoint].method](endpoint, (req, res) => {
        trycatch(
          () => {
            require('./controllers/' + routes[endpoint].controller + '.js')[routes[endpoint].function](
              APP,
              req,
              (err, result) => {
                if (err) return resOutput(APP, req, res, err, 'err');

                if (req.headers['encrypt'] && req.headers['encrypt'] == 'true') {
                  result.data = require('./functions/rsa').encrypt(result.data || []);
                }

                return resOutput(APP, req, res, result, 'ok');
              }
            );
          },
          err => {
            console.log(err); //Debugging Purpose
            return resOutput(
              APP,
              req,
              res,
              {
                id: '-1',
                code: 'ERR_GENERAL'
              },
              'err'
            );
          }
        );
      });

      if (n === len) {
        app.use((req, res) => {
          return resOutput(
            APP,
            req,
            res,
            {
              id: '-1',
              code: 'SERVICE_NOT_FOUND'
            },
            'err'
          );
        });

        app.listen(process.env.PORT, () => {
          console.log('[OK] ' + process.env.SERVICE_NAME + ' start on port ' + process.env.PORT + '!');
          console.log('[OK] ' + (len + 1) + ' route(s) registered!');
          return;
        });
      }

      n++;
    });
  }
);
