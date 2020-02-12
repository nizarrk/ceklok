'use strict';

/**
 * @MONGO CONFIGURATION
 */
if (process.env.MONGO === 'true') {
  const mongoose = require('mongoose');
  const host = process.env.MONGO_HOST;
  const name = process.env.MONGO_NAME;
  let mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  };

  mongoose.connect('mongodb://' + host + '/' + name, mongoOptions);
  mongoose.connection.on('error', console.error.bind(console, '[ERR] Mongo connection error!'));
  mongoose.connection.once('open', () => {
    console.log('[OK] Mongo connected!');
  });

  exports.mongo = mongoose;
}

/**
 * @MYSQL CONFIGURATION
 */
if (process.env.MYSQL === 'true') {
  const Sequelize = require('sequelize');
  const mysqlPool = {
    min: Number(process.env.MYSQL_POOL_MIN),
    max: Number(process.env.MYSQL_POOL_MAX),
    idle: Number(process.env.MYSQL_POOL_IDLE),
    acquire: Number(process.env.MYSQL_POOL_ACQUIRE),
    evict: Number(process.env.MYSQL_POOL_EVICT),
    handleDisconnects: true
  };

  const operatorsAliases = {
    $between: Sequelize.Op.between,
    $and: Sequelize.Op.and,
    $or: Sequelize.Op.or,
    $eq: Sequelize.Op.eq,
    $ne: Sequelize.Op.ne,
    $gte: Sequelize.Op.gte,
    $gt: Sequelize.Op.gt,
    $lt: Sequelize.Op.lt,
    $lte: Sequelize.Op.lte,
    $like: Sequelize.Op.like,
    $in: Sequelize.Op.in,
    $not: Sequelize.Op.not
  };

  const define = {
    timestamps: false,
    paranoid: true,
    freezeTableName: true
  };
  const mysqlDialectOptions = {
    connectTimeout: Number(process.env.MYSQL_DIALECT_CONNECT_TIMEOUT)
  };
  const mysqlDialect = process.env.MYSQL_DIALECT;
  let options =
    process.env.NODE_ENV === 'production'
      ? {
          host: process.env.MYSQL_HOST,
          port: process.env.MYSQL_PORT,
          dialect: mysqlDialect,
          pool: mysqlPool,
          dialectOptions: mysqlDialectOptions,
          define: define,
          operatorsAliases: operatorsAliases,
          logging: false // Disable logging in production.
        }
      : {
          host: process.env.MYSQL_HOST,
          port: process.env.MYSQL_PORT,
          dialect: mysqlDialect,
          pool: mysqlPool,
          dialectOptions: mysqlDialectOptions,
          define: define,
          operatorsAliases: operatorsAliases,
          timezone: '+07:00'
        };
  const sequelize = new Sequelize(process.env.MYSQL_NAME, process.env.MYSQL_USER, process.env.MYSQL_PASS, options);

  // generate db for each company
  const customSequelize = dbname => {
    return new Sequelize(dbname, process.env.MYSQL_USER, process.env.MYSQL_PASS, options);
  };

  sequelize
    .authenticate()
    .then(() => {
      console.log('[OK] MySQL connected!');
    })
    .catch(err => {
      console.error('[ERR] MySQL connection error!', err);
    });

  exports.sequelize = sequelize;
  exports.Sequelize = Sequelize;
  exports.customSequelize = customSequelize;
}
