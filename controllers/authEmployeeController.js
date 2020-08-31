'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = require('../config/jwt-key.json');
const async = require('async');
const moment = require('moment');
const trycatch = require('trycatch');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const generateEmployeeCode = async (APP, req, index) => {
    let tgl = new Date().getDate().toString();
    if (tgl.length == 1) {
        tgl = '0' + new Date().getDate().toString();
    }
    let month = (new Date().getMonth() + 1).toString();
    if (month.length == 1) {
        month = '0' + month;
    }
    let year = new Date()
        .getFullYear()
        .toString()
        .slice(2, 4);
    let time = year + month + tgl;
    let pad = '0000';
    let kode = '';
    let add = 1;

    if (index) {
        add = index;
    }

    let res = await APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee.findAll({
        limit: 1,
        order: [['id', 'DESC']]
    });

    if (res.length == 0) {
        console.log('kosong');
        let str = '' + 1;

        kode = req.body.company + '-' + time + str;

        return kode;
    } else {
        console.log('ada');
        let lastID = res[0].employee_code;
        let replace = lastID.replace(req.body.company + '-', '');
        let lastNum = replace.charAt(replace.length - 1);

        let num = parseInt(lastNum) + add;

        kode = req.body.company + '-' + time + num;

        return kode;
    }
};

exports.checkExistingTelp = (APP, req, callback) => {
    APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
        .findAll({
            where: {
                tlp: req.body.telp
            }
        })
        .then(res => {
            if (res && res.length > 0) {
                callback({
                    code: 'DUPLICATE',
                    message: 'Error! Duplicate telp!',
                    info: {
                        dataCount: res.length,
                        parameter: 'telp'
                    }
                });
            } else {
                callback(null, {
                    code: 'OK'
                });
            }
        })
        .catch(err => {
            console.log('iki error telp', err);

            callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.checkExistingEmail = (APP, req, callback) => {
    APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
        .findAll({
            where: {
                email: req.body.email
            }
        })
        .then(res => {
            if (res && res.length > 0) {
                callback({
                    code: 'DUPLICATE',
                    message: 'Error! Duplicate Email!'
                });
            } else {
                callback(null, {
                    code: 'OK'
                });
            }
        })
        .catch(err => {
            console.log('iki error email', err);

            callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.checkExistingUsername = (APP, req, callback) => {
    APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
        .findAll({
            where: {
                company_code: req.body.company,
                user_name: req.body.username
            }
        })
        .then(res => {
            if (res && res.length > 0) {
                callback({
                    code: 'DUPLICATE',
                    message: 'Error! Duplicate Username!',
                    info: {
                        dataCount: res.length,
                        parameter: 'username'
                    }
                });
            } else {
                callback(null, {
                    code: 'OK'
                });
            }
        })
        .catch(err => {
            console.log('iki error username', err);

            callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.checkExistingCompany = (APP, req, callback) => {
    APP.models.mysql.company
        .findAll({
            where: {
                company_code: req.body.company ? req.body.company : ''
            }
        })
        .then(res => {
            if (res && res.length > 0) {
                return callback(null, {
                    code: 'FOUND',
                    data: res
                });
            }
            callback({
                code: 'NOT_FOUND',
                message: 'Company tidak ditemukan'
            });
        })
        .catch(err => {
            console.log('iki error company', err);

            callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.checkExistingCredentials = (APP, req, callback) => {
    async.waterfall(
        [
            function checkUsername(callback) {
                module.exports.checkExistingUsername(APP, req, callback);
            },

            function checkTelp(result, callback) {
                module.exports.checkExistingTelp(APP, req, callback);
            },

            function checkEmail(result, callback) {
                module.exports.checkExistingEmail(APP, req, callback);
            }
        ],
        (err, result) => {
            if (err) return callback(err);

            callback(null, result);
        }
    );
};

exports.register = (APP, req, callback) => {
    async.waterfall(
        [
            function checkDB(callback) {
                APP.checkDB(req.body.company).then(res => {
                    if (res.length == 0) {
                        return callback({
                            code: 'NOT_FOUND',
                            message: 'Company not found!'
                        });
                    }

                    callback(null, true);
                });
            },

            function checkCredentials(result, callback) {
                module.exports.checkExistingCredentials(APP, req, callback);
            },

            function generateCode(result, callback) {
                let code = new Promise((resolve, reject) => {
                    resolve(generateEmployeeCode(APP, req));
                });

                code.then(res => {
                    callback(null, res);
                }).catch(err => {
                    callback({
                        code: 'ERR',
                        data: err
                    });
                });
            },

            function encryptPassword(result, callback) {
                let pass = APP.validation.password(req.body.pass);
                if (pass === true) {
                    bcrypt
                        .hash(req.body.pass, 10)
                        .then(hashed => {
                            return callback(null, {
                                kode: result,
                                pass: hashed
                            });
                        })
                        .catch(err => {
                            callback({
                                code: 'ERR_BCRYPT',
                                data: err
                            });
                        });
                } else {
                    return callback(pass);
                }
            },

            function registerToSupportPal(data, callback) {
                if (process.env.SUPP !== true) return callback(null, data);

                let fullname = req.body.name.split(' ');
                let firstname = fullname[0];
                let lastname = fullname[fullname.length - 1];

                axios({
                    method: 'POST',
                    auth: {
                        username: process.env.SUPP_TOKEN,
                        password: ''
                    },
                    url: `${process.env.SUPP_HOST}/api/user/user`,
                    data: {
                        brand_id: process.env.SUPP_BRAND_ID,
                        firstname: firstname,
                        lastname: lastname,
                        email: req.body.email,
                        password: data.pass,
                        organisation: 'CEKLOK'
                    }
                })
                    .then(res => {
                        callback(null, {
                            pass: data.pass,
                            kode: data.kode,
                            support: res.data.data
                        });
                    })
                    .catch(err => {
                        if (
                            err.response.data.status == 'error' &&
                            err.response.data.message == 'The email has already been taken.'
                        ) {
                            callback(null, {
                                pass: data.pass,
                                kode: data.kode
                            });
                        } else {
                            callback({
                                code: 'ERR',
                                message: err.response.data.message,
                                data: err
                            });
                        }
                    });
            },

            function getSupportPalId(data, callback) {
                if (process.env.SUPP !== true) return callback(null, data);
                if (data.support.length > 0) return callback(null, data);

                axios({
                    method: 'GET',
                    auth: {
                        username: process.env.SUPP_TOKEN,
                        password: ''
                    },
                    url: `${process.env.SUPP_HOST}/api/user/user?email=${req.body.email}&brand_id=${process.env.SUPP_BRAND_ID}`
                })
                    .then(res => {
                        if (res.data.data.length == 0) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Email tidak ditemukan!'
                            });
                        } else {
                            callback(null, {
                                pass: data.pass,
                                kode: data.kode,
                                support: res.data.data[0]
                            });
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            message: err.response.data.message,
                            data: err
                        });
                    });
            },

            function registerUser(data, callback) {
                let email = APP.validation.email(req.body.email);
                let username = APP.validation.username(req.body.username);

                if (email && username) {
                    APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee
                        .build({
                            support_pal_id: process.env.SUPP == true ? data.support.id : null,
                            employee_code: data.kode,
                            company_code: req.body.company,
                            nik: req.body.nik,
                            name: req.body.name,
                            gender: req.body.gender,
                            pob: req.body.pob,
                            dob: req.body.dob,
                            address: req.body.address,
                            kelurahan: req.body.kel,
                            kecamatan: req.body.kec,
                            city: req.body.city,
                            province: req.body.prov,
                            zipcode: req.body.zip,
                            photo: 'default.jpg',
                            msisdn: 'default',
                            tlp: req.body.telp,
                            email: req.body.email,
                            user_name: req.body.username,
                            password: data.pass,
                            old_password: data.pass
                        })
                        .save()
                        .then(result => {
                            let params = 'Insert Success'; //This is only example, Object can also be used
                            return callback(null, {
                                code: 'INSERT_SUCCESS',
                                data: result.dataValues || params
                            });
                        })
                        .catch(err => {
                            console.log(err);

                            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
                                let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
                                return callback({
                                    code: 'DUPLICATE',
                                    data: params
                                });
                            }

                            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
                                let params = 'Error! Empty Query'; //This is only example, Object can also be used
                                return callback({
                                    code: 'UPDATE_NONE',
                                    data: params
                                });
                            }

                            return callback({
                                code: 'ERR_DATABASE',
                                data: err
                            });
                        });
                } else {
                    if (email !== true) return callback(email);
                    if (username !== true) return callback(username);
                }
            }
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return callback(err);
            }

            callback(null, result);
        }
    );
};

exports.login = (APP, req, callback) => {
    let { employee, employee_face, overtime_setting } = APP.models.company[
        process.env.MYSQL_NAME + '_' + req.body.company.toUpperCase()
    ].mysql;
    let { company } = APP.models.mysql;

    async.waterfall(
        [
            function checkBody(callback) {
                if (!req.body.company)
                    return callback({
                        code: 'MISSING_KEY',
                        data: req.body,
                        message: 'Missing key, company'
                    });

                if (!req.body.username)
                    return callback({
                        code: 'MISSING_KEY',
                        data: req.body,
                        message: 'Missing key, username'
                    });

                if (!req.body.pass)
                    return callback({
                        code: 'MISSING_KEY',
                        data: req.body,
                        message: 'Missing key, password'
                    });

                if (!req.body.platform)
                    return callback({
                        code: 'MISSING_KEY',
                        data: req.body,
                        message: 'Missing key, platform'
                    });

                if (req.body.platform != 'Web' && req.body.platform != 'Mobile')
                    return callback({
                        code: 'INVALID_KEY',
                        data: req.body,
                        message: 'Missing key, platform'
                    });

                callback(null, true);
            },

            function checkDB(data, callback) {
                APP.checkDB(req.body.company).then(res => {
                    if (res.length == 0) {
                        return callback({
                            code: 'NOT_FOUND',
                            message: 'Company not found!'
                        });
                    }

                    callback(null, true);
                });
            },

            function checkUser(index, callback) {
                employee.hasMany(employee_face, {
                    sourceKey: 'id',
                    foreignKey: 'employee_id'
                });

                employee.belongsTo(company, {
                    targetKey: 'company_code',
                    foreignKey: 'company_code'
                });

                employee
                    .findAll({
                        include: [
                            {
                                model: employee_face,
                                attributes: ['id', 'image']
                            },
                            {
                                model: company,
                                attributes: ['id', 'name']
                            }
                        ],
                        attributes: [
                            'id',
                            'support_pal_id',
                            'company_code',
                            'grade_id',
                            'name',
                            'password',
                            'photo',
                            'initial_login',
                            'login_attempt',
                            'status',
                            'created_at',
                            'updated_at'
                        ],
                        where: {
                            user_name: req.body.username,
                            company_code: req.body.company
                        }
                    })
                    .then(rows => {
                        if (rows.length == 0) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Invalid Username or Password'
                            });
                        } else {
                            if (rows[0].status !== 1) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'User have to wait for admin to verify their account first!'
                                });
                            } else {
                                // let now = new Date().getTime();
                                // let updated = new Date(rows[0].updated_at).getTime();
                                // console.log(rows[0].login_attempt >= 3 && now > updated);

                                if (rows[0].login_attempt < 3) {
                                    callback(null, rows[0]);
                                } else {
                                    callback({
                                        code: 'INVALID_REQUEST',
                                        message:
                                            'Anda telah mencapai limit kesalahan login! Silahkan menghubungi tim operasional untuk membuka akses pada akun anda kembali!'
                                    });
                                }
                            }
                        }
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function checkOvertimeRequestPermission(rows, callback) {
                overtime_setting
                    .findOne({
                        where: {
                            overtime_setting_id: 1
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            rows.overtime_request = 0;
                            callback(null, rows);
                        } else {
                            rows.overtime_request = res.value == rows.grade_id ? 1 : 0;
                            callback(null, rows);
                        }
                    })
                    .catch(err => {
                        console.log('Error checkOvertimeRequestPermission', err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function commparePassword(rows, callback) {
                bcrypt
                    .compare(req.body.pass, rows.password)
                    .then(res => {
                        if (res === true) {
                            // reset failed attempt counter
                            employee
                                .update(
                                    {
                                        login_attempt: 0,
                                        updated_at: new Date()
                                    },
                                    {
                                        where: {
                                            id: rows.id
                                        }
                                    }
                                )
                                .then(() => {
                                    callback(null, {
                                        id: rows.id,
                                        support_pal_id: rows.support_pal_id,
                                        company: rows.company.id,
                                        grade: rows.grade_id,
                                        overtime_request: rows.overtime_request,
                                        company_code: rows.company_code,
                                        name: rows.name,
                                        photo: rows.photo,
                                        initial_login: rows.initial_login,
                                        employee_faces: rows.employee_faces
                                    });
                                })
                                .catch(err => {
                                    callback({
                                        code: 'ERR_DATABASE',
                                        data: err
                                    });
                                });
                        } else {
                            // update failed attempt counter
                            employee
                                .update(
                                    {
                                        login_attempt: rows.login_attempt + 1,
                                        updated_at: new Date()
                                    },
                                    {
                                        where: {
                                            id: rows.id
                                        }
                                    }
                                )
                                .then(() => {
                                    callback({
                                        code: 'INVALID_REQUEST',
                                        message: 'Invalid Username or Password'
                                    });
                                })
                                .catch(err => {
                                    callback({
                                        code: 'ERR_DATABASE',
                                        data: err
                                    });
                                });
                        }
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR',
                            data: err
                        });
                    });
            },

            function initialLoginStatus(rows, callback) {
                employee
                    .update(
                        {
                            initial_login: 1
                        },
                        {
                            where: {
                                id: rows.id
                            }
                        }
                    )
                    .then(() => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function setToken(rows, callback) {
                console.log(rows);
                let token = jwt.sign(
                    {
                        id: rows.id,
                        company: rows.company,
                        grade: rows.grade,
                        code: rows.company_code,
                        db: `${process.env.MYSQL_NAME}_${rows.company_code}`,
                        level: 3,
                        admin: false
                    },
                    key.key,
                    {
                        expiresIn: '1d'
                    }
                );

                APP.models.mongo.token
                    .findOne({
                        id_user: rows.id,
                        level: 3,
                        company_code: rows.company_code,
                        platform: req.body.platform
                    })
                    .then(res => {
                        if (res !== null) {
                            console.log('iki update');

                            APP.models.mongo.token
                                .findByIdAndUpdate(res._id, {
                                    token,
                                    date: req.customDate,
                                    time: req.customTime,
                                    elapsed_time: req.elapsedTime || '0'
                                })
                                .then(() => {
                                    callback(null, {
                                        code: 'UPDATE_SUCCESS',
                                        data: {
                                            row: rows,
                                            token
                                        },
                                        info: {
                                            dataCount: rows.length
                                        }
                                    });
                                })
                                .catch(err => {
                                    callback({
                                        code: 'ERR_DATABASE',
                                        data: err
                                    });
                                });
                        } else {
                            console.log('iki insert');

                            APP.models.mongo.token
                                .create({
                                    id_user: rows.id,
                                    level: 3,
                                    company_code: rows.company_code,
                                    platform: req.body.platform,
                                    token,
                                    date: req.customDate,
                                    time: req.customTime,
                                    elapsed_time: req.elapsedTime || '0'
                                })
                                .then(() => {
                                    callback(null, {
                                        code: rows !== null ? 'FOUND' : 'NOT_FOUND',
                                        data:
                                            rows !== null
                                                ? {
                                                      row: rows,
                                                      token
                                                  }
                                                : null,
                                        info: {
                                            dataCount: rows.length
                                        }
                                    });
                                })
                                .catch(err => {
                                    callback({
                                        code: 'ERR_DATABASE',
                                        data: err
                                    });
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

exports.forgotPassword = (APP, req, callback) => {
    let query;
    async.waterfall(
        [
            function checkLevel(callback) {
                if (req.body.level == 1) {
                    query = APP.models.mysql.admin_app;
                    callback(null, true);
                } else if (req.body.level == 2) {
                    query = APP.models.mysql.admin;
                    callback(null, true);
                } else if (req.body.level == 3) {
                    APP.checkDB(req.body.company).then(res => {
                        if (res.length == 0) {
                            return callback({
                                code: 'NOT_FOUND',
                                message: 'Company not found!'
                            });
                        }

                        query = APP.models.company[`${process.env.MYSQL_NAME}_${req.body.company}`].mysql.employee;
                        callback(null, true);
                    });
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: '',
                        message: 'Invalid User Level'
                    });
                }
            },

            function checkCompany(data, callback) {
                if (req.body.level == 3) {
                    module.exports.checkExistingCompany(APP, req, callback);
                } else {
                    callback(null, true);
                }
            },

            function checkEmail(data, callback) {
                query
                    .findOne({
                        where: {
                            email: req.body.email
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                info: {
                                    parameter: 'No records found'
                                }
                            });
                        } else {
                            callback(null, res.dataValues);
                        }
                    })
                    .catch(err => {
                        console.log('Error checkEmail', err);

                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error checkEmail',
                            data: err
                        });
                    });
            },

            function createOTP(result, callback) {
                let otp = APP.otp.generateOTP();

                let params =
                    req.body.level == 1
                        ? {
                              email: req.body.email,
                              // date: req.currentDate,
                              endpoint: req.originalUrl,
                              level: req.body.level
                          }
                        : req.body.level == 2
                        ? {
                              email: req.body.email,
                              // date: req.currentDate,
                              company: result.company_code,
                              endpoint: req.originalUrl,
                              level: req.body.level
                          }
                        : req.body.level == 3
                        ? {
                              email: req.body.email,
                              // date: req.currentDate,
                              company: result.company_code,
                              endpoint: req.originalUrl,
                              level: req.body.level
                          }
                        : callback({
                              code: 'INVALID_REQUEST',
                              message: 'Invalid user level!'
                          });

                APP.models.mongo.otp.findOne(params).then(res => {
                    if (res != null) {
                        if (res.date.getTime() === req.currentDate.getTime() && res.count >= 3) {
                            return callback({
                                code: 'INVALID_REQUEST',
                                message: 'Limit reached for today!'
                            });
                        }
                        if (res.date.getTime() !== req.currentDate.getTime() || res.count <= 3) {
                            APP.models.mongo.otp
                                .findByIdAndUpdate(res._id, {
                                    otp: otp,
                                    count: res.count == 3 ? 1 : res.count + 1,
                                    failed: 0,
                                    expired_time: moment()
                                        .add(1, 'days')
                                        .format('YYYY-MM-DD HH:mm:ss'),
                                    expired: false,
                                    date: req.currentDate,
                                    time: req.customTime,
                                    elapsed_time: req.elapsedTime || '0'
                                })
                                .then(updated => {
                                    updated.new_otp = otp;
                                    callback(null, updated);
                                })
                                .catch(err => {
                                    console.log('Error update createOTP', err);
                                    callback({
                                        code: 'ERR_DATABASE',
                                        message: 'Error update createOTP',
                                        data: err
                                    });
                                });
                        }
                    } else {
                        APP.models.mongo.otp
                            .create({
                                email: req.body.email,
                                otp: otp,
                                count: 1,
                                failed: 0,
                                endpoint: req.originalUrl,
                                level: req.body.level,
                                expired_time: moment()
                                    .add(1, 'days')
                                    .format('YYYY-MM-DD HH:mm:ss'),
                                expired: false,
                                company: result.company_code,
                                date: req.currentDate,
                                time: req.customTime,
                                elapsed_time: req.elapsedTime || '0'
                            })
                            .then(created => {
                                created.new_otp = otp;
                                callback(null, created);
                            })
                            .catch(err => {
                                console.log('Error insert createOTP', err);
                                callback({
                                    code: 'ERR_DATABASE',
                                    message: 'Error insert createOTP',
                                    data: err
                                });
                            });
                    }
                });
            },

            function sendEmail(data, callback) {
                try {
                    //send to email
                    APP.mailer.sendMail({
                        subject: 'Reset Password',
                        to: req.body.email,
                        data: {
                            otp: data.new_otp
                        },
                        file: 'forgot_password.html'
                    });

                    callback(null, {
                        code: 'OK',
                        message: 'Berhasil melakukan lupa password!'
                        // data: data
                    });
                } catch (err) {
                    console.log('Error sendMail', err);
                    callback({
                        code: 'ERR',
                        message: 'Error sendMail'
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

exports.checkOTP = (APP, req, callback) => {
    let { email, company, otp, level } = req.body;
    async.waterfall(
        [
            function checkBody(callback) {
                if (email && otp && level) {
                    if (level == 3) {
                        if (!company)
                            return callback({ code: 'INVALID_REQUEST', message: 'Kesalahan pada parameter company!' });

                        let params = {
                            email: email,
                            company: company,
                            level: level,
                            endpoint: '/auth/forgotpassword',
                            expired: false
                        };

                        callback(null, params);
                    } else {
                        let params = {
                            email: email,
                            level: level,
                            endpoint: '/auth/forgotpassword',
                            expired: false
                        };

                        callback(null, params);
                    }
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter!'
                    });
                }
            },

            function checkOTP(data, callback) {
                APP.models.mongo.otp
                    .findOne(data)
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Kode OTP tidak ditemukan atau sudah kedaluarsa!'
                            });
                        } else {
                            callback(null, res);
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function updateOTP(data, callback) {
                let cond1 = new Date().getTime() <= new Date(data.expired_time).getTime(); // if date now < date expired
                let cond2 = data.date.getTime() === req.currentDate.getTime() && data.failed < 3; // same date & failed < 3
                console.log(data.date);
                console.log(req.currentDate);

                console.log(cond1);
                console.log(cond2);

                if (cond1 && cond2 && data.otp == otp) {
                    callback(null, {
                        code: 'FOUND',
                        message: 'OTP ditemukan!'
                        // data: data
                    });
                } else {
                    data.update({
                        failed: data.failed == 3 ? 3 : data.failed + 1,
                        expired: !cond1 ? true : !cond2 ? true : data.failed + 1 == 3 ? true : false
                    })
                        .then(() => {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Kode OTP tidak sesuai!'
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
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

exports.resetPassword = (APP, req, callback) => {
    let query;
    let { pass, konf, email, level, company, otp } = req.body;
    async.waterfall(
        [
            function checkBody(callback) {
                if (pass && konf && email && level && otp) {
                    let password = APP.validation.password(pass);
                    let konfirm = APP.validation.password(konf);

                    if (password != true) {
                        return callback(password);
                    }

                    if (konfirm != true) {
                        console.log('konfirm');

                        return callback(konfirm);
                    }

                    if (konf !== pass) {
                        callback({
                            code: 'INVALID_REQUEST',
                            message: 'Invalid password confirm'
                        });
                    }

                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: '',
                        message: 'Kesalahan pada parameter!'
                    });
                }
            },

            function checkLevel(data, callback) {
                if (level == 1) {
                    query = APP.models.mysql.admin_app;
                    callback(null, true);
                } else if (level == 2 || level == 3) {
                    if (company) {
                        query =
                            level == 3
                                ? APP.models.company[`${process.env.MYSQL_NAME}_${company}`].mysql.employee
                                : APP.models.mysql.admin;
                        callback(null, true);
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            id: '',
                            message: 'Kesalahan pada parameter company!'
                        });
                    }
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: '',
                        message: 'Invalid User Level'
                    });
                }
            },

            function checkOTP(data, callback) {
                module.exports.checkOTP(APP, req, callback);
            },

            function checkCompany(data, callback) {
                if (level == 3) {
                    module.exports.checkExistingCompany(APP, req, callback);
                } else {
                    callback(null, true);
                }
            },

            function checkPassword(data, callback) {
                query
                    .findOne({
                        where: {
                            email: email
                        }
                    })
                    .then(res => {
                        bcrypt.compare(pass, res.password).then(res => {
                            console.log(res);

                            if (res === false) return callback(null, true);

                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Password is match with previous password!'
                            });
                        });
                    })
                    .catch(err => {
                        console.log('Error checkPassword', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error checkPassword',
                            data: err
                        });
                    });
            },

            function encryptPassword(result, callback) {
                let checkPass = APP.validation.password(pass);
                if (checkPass === true) {
                    bcrypt.hash(pass, 10).then(hashed => {
                        callback(null, hashed);
                    });
                } else {
                    callback(checkPass);
                }
            },

            function updatePassword(result, callback) {
                query
                    .findOne({
                        where: {
                            email: email
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                data: null
                            });
                        } else {
                            res.update({
                                password: result,
                                updated_at: new Date()
                            })
                                .then(res => {
                                    callback(null, res);
                                })
                                .catch(err => {
                                    console.log('Error update updatePassword', err);
                                    callback({
                                        code: 'ERR_DATABASE',
                                        message: 'Error update updatePassword',
                                        data: err
                                    });
                                });
                        }
                    })
                    .catch(err => {
                        console.log('Error findOne updatePassword', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error findOne updatePassword',
                            data: err
                        });
                    });
            },

            function updateOTPStatus(data, callback) {
                APP.models.mongo.otp
                    .findOne({
                        email: email,
                        otp: otp,
                        endpoint: '/auth/forgotpassword'
                    })
                    .then(res => {
                        res.update({
                            expired: true
                        })
                            .then(() => {
                                callback(null, {
                                    code: 'UPDATE_SUCCESS',
                                    data: data
                                });
                            })
                            .catch(err => {
                                console.log(err);
                                callback({
                                    code: 'ERR_DATABASE',
                                    data: err
                                });
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

exports.logout = (APP, req, callback) => {
    APP.models.mongo.token
        .findOneAndDelete({
            token: req.headers.authorization
        })
        .then(res => {
            if (res == null) {
                return callback({
                    code: 'NOT_FOUND',
                    message: 'Token login tidak ditemukan'
                });
            }

            callback(null, {
                code: 'FOUND',
                message: 'Token login ditemukan dan berhasil dihapus',
                data: res
            });
        })
        .catch(err => {
            console.log(err);

            callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};
