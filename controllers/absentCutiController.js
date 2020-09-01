'use strict';

const async = require('async');
const moment = require('moment-business-days');
const trycatch = require('trycatch');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

exports.get = function(APP, req, callback) {
    let { absent_cuti, absent_type, cuti_type } = APP.models.company[req.user.db].mysql;
    let params = {};

    if (req.user.level === 3) {
        params.user_id = req.user.id;
    }

    if (req.body.status || req.body.status === 0) {
        params.status = req.body.status;
    }

    if (req.body.datestart && req.body.dateend) {
        params.$or = [
            {
                date_start: {
                    $between: [req.body.datestart, req.body.dateend]
                }
            },
            {
                date_end: {
                    $between: [req.body.datestart, req.body.dateend]
                }
            }
        ];
    }

    if (req.body.status && req.body.datestart && req.body.dateend) {
        params.status = req.body.status;

        params.$or = [
            {
                date_start: {
                    $between: [req.body.datestart, req.body.dateend]
                }
            },
            {
                date_end: {
                    $between: [req.body.datestart, req.body.dateend]
                }
            }
        ];
    }

    console.log(params);

    // APP.db.sequelize
    // .query(
    //   `SELECT * FROM ${req.user.db}.absent_cuti
    //   WHERE
    //     user_id = ${req.user.id}
    //   AND
    //     '${req.body.datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${
    //     req.body.dateend
    //   }' <= date_format(date_end, '%Y-%m-%d')
    //   OR
    //     '${req.body.datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${
    //     req.body.datestart
    //   }' <= date_format(date_end, '%Y-%m-%d')
    //   OR
    //     '${req.body.dateend}' >= date_format(date_start, '%Y-%m-%d') AND '${
    //     req.body.dateend
    //   }' <= date_format(date_end, '%Y-%m-%d')`
    // )

    absent_cuti.belongsTo(absent_type, {
        targetKey: 'code',
        foreignKey: 'absent_cuti_type_code'
    });

    absent_cuti.belongsTo(cuti_type, {
        targetKey: 'code',
        foreignKey: 'absent_cuti_type_code'
    });

    absent_cuti
        .findAll({
            include: [
                {
                    model: absent_type,
                    attributes: ['id', 'name', 'description', 'type']
                },
                {
                    model: cuti_type,
                    attributes: ['id', 'name', 'description', 'type']
                }
            ],
            where: params == {} ? 1 + 1 : params,
            order: [['id', 'DESC']]
        })
        .then(rows => {
            return callback(null, {
                code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                data: rows,
                info: {
                    dataCount: rows.length
                }
            });
        })
        .catch(err => {
            return callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.getById = (APP, req, callback) => {
    let { absent_cuti, employee, grade, absent_type, cuti_type, schedule } = APP.models.company[req.user.db].mysql;

    absent_cuti.belongsTo(employee, {
        targetKey: 'id',
        foreignKey: 'user_id'
    });

    employee.belongsTo(grade, {
        targetKey: 'id',
        foreignKey: 'grade_id'
    });

    employee.belongsTo(schedule, {
        targetKey: 'id',
        foreignKey: 'schedule_id'
    });

    absent_cuti.belongsTo(absent_type, {
        targetKey: 'code',
        foreignKey: 'absent_cuti_type_code'
    });

    absent_cuti.belongsTo(cuti_type, {
        targetKey: 'code',
        foreignKey: 'absent_cuti_type_code'
    });

    absent_cuti
        .findOne({
            include: [
                {
                    model: employee,
                    attributes: ['id', 'nik', 'name', 'tlp', 'photo', 'email', 'grade_id'],
                    include: [
                        {
                            model: grade,
                            attributes: ['id', 'name', 'description']
                        },
                        {
                            model: schedule,
                            attributes: ['id', 'name', 'description', 'work_day']
                        }
                    ]
                },
                {
                    model: absent_type,
                    attributes: ['id', 'name', 'description', 'type']
                },
                {
                    model: cuti_type,
                    attributes: ['id', 'name', 'description', 'type']
                }
            ],
            where: {
                id: req.body.id
            }
        })
        .then(res => {
            if (res == null) {
                callback({
                    code: 'NOT_FOUND',
                    message: 'Request tidak ditemukan!'
                });
            } else {
                if (req.user.level == 3) {
                    if (res.user_id == req.user.id) {
                        callback(null, {
                            code: 'FOUND',
                            message: 'Request Ditemukan!',
                            data: res
                        });
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            message: 'Invalid Access!'
                        });
                    }
                } else {
                    callback(null, {
                        code: 'FOUND',
                        message: 'Request Ditemukan!',
                        data: res
                    });
                }
            }
        })
        .catch(err => {
            console.log(err);
            return callback({
                code: 'ERR_DATABASE',
                data: err
            });
        });
};

exports.insert = function(APP, req, callback) {
    let { absent_cuti, absent_type, cuti_type, employee, schedule } = APP.models.company[req.user.db].mysql;
    let { type, typeid, codeid, datestart, dateend, timestart, timeend, desc } = req.body;
    async.waterfall(
        [
            function checkBody(callback) {
                if (type && typeid && codeid && datestart && dateend && timestart && timeend) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter'
                    });
                }
            },

            function generateCode(data, callback) {
                let kode = APP.generateCode(absent_cuti, 'AC');
                Promise.resolve(kode)
                    .then(x => {
                        callback(null, x);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            id: '?',
                            message: 'Terjadi Kesalahan, mohon coba kembali',
                            data: err
                        });
                    });
            },

            function checkType(result, callback) {
                if (type == 0) {
                    // 0 = absent
                    absent_type
                        .findOne({
                            where: {
                                id: typeid,
                                status: 1
                            }
                        })
                        .then(res => {
                            if (res === null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    message: 'Tipe absent tidak ditemukan.'
                                });
                            } else {
                                callback(null, {
                                    kode: result,
                                    typeid: res.type,
                                    cut: res.type_cut
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error function checkType',
                                data: err
                            });
                        });
                } else if (type == 1) {
                    // 1 = cuti
                    cuti_type
                        .findOne({
                            where: {
                                id: typeid
                            }
                        })
                        .then(res => {
                            if (res === null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    message: 'Tipe cuti tidak ditemukan.'
                                });
                            } else {
                                callback(null, {
                                    kode: result,
                                    typeid: res.type,
                                    days: res.days
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error function checkType',
                                data: err
                            });
                        });
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Tipe request tidak terdefinisi'
                    });
                }
            },

            function checkSchedule(result, callback) {
                employee.belongsTo(schedule, {
                    targetKey: 'id',
                    foreignKey: 'schedule_id'
                });

                employee
                    .findOne({
                        include: [
                            {
                                model: schedule,
                                attributes: ['id', 'name', 'description', 'work_day', 'work_time'],
                                required: true
                            }
                        ],
                        where: {
                            id: req.user.id,
                            status: 1
                        }
                    })
                    .then(res => {
                        if (res === null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Schedule tidak ditemukan.'
                            });
                        } else {
                            callback(null, {
                                kode: result.kode,
                                typeid: result.typeid,
                                cut: result.cut,
                                days: result.days,
                                left: res.total_cuti,
                                schedule: {
                                    workday: res.schedule.work_day,
                                    time: res.schedule.work_time
                                }
                            });
                        }
                    })
                    .catch(err => {
                        console.log('Error checkSchedule', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error checkSchedule',
                            data: err
                        });
                    });
            },

            function checkDay(data, callback) {
                moment.updateLocale('us', {
                    workingWeekdays: data.schedule.workday
                });

                // 0 = absent
                if (type == 0) {
                    // ijin durasi hari
                    if (data.typeid == 1) {
                        console.log('ijin durasi hari');

                        let date1 = moment(datestart);
                        let date2 = moment(dateend);
                        console.log(date2.diff(date1, 'days'));

                        let diff = date2.diff(date1, 'days') + 1; // +1 biar hari pertama keitung cuti
                        console.log(diff);

                        let listDate = [];
                        let dateMove = new Date(date1);
                        let strDate = datestart;

                        while (strDate < dateend) {
                            strDate = dateMove.toISOString().slice(0, 10);
                            dateMove.setDate(dateMove.getDate() + 1);
                            let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

                            if (!checkDay) {
                                listDate.push(strDate);
                            }
                        }

                        console.log(listDate);

                        let work_skip = data.cut == 0 ? '00:00:00' : APP.time.timeXday(data.schedule.time, diff);

                        callback(null, {
                            kode: data.kode,
                            days: diff - listDate.length,
                            typeid: data.typeid,
                            time: work_skip
                        });
                    }

                    // ijin durasi jam
                    else if (data.typeid == 0) {
                        let time = moment
                            .utc(moment(timeend, 'HH:mm:ss').diff(moment(timestart, 'HH:mm:ss')))
                            .format('HH:mm:ss');
                        let timeDay = moment.duration(data.schedule.time).asMilliseconds() / 2;
                        let timeIzin = moment.duration(time).asMilliseconds();
                        let date = datestart;
                        dateend = date;

                        // if jam izin lebih dari setengah jam kerja per hari
                        if (timeIzin > timeDay) {
                            callback(null, {
                                kode: data.kode,
                                days: 1,
                                typeid: data.typeid,
                                time: data.schedule.time
                            });
                        } else {
                            callback(null, {
                                kode: data.kode,
                                days: 0,
                                typeid: data.typeid,
                                time: data.cut == 0 ? '00:00:00' : time
                            });
                        }
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            message: 'Tipe absent tidak tersedia'
                        });
                    }
                }

                // 1 = cuti
                else if (type == 1) {
                    // 0 = cuti reguler
                    if (data.typeid == 0) {
                        let date1 = moment(datestart);
                        let date2 = moment(dateend);
                        let diff = date2.diff(date1, 'days') + 1; // +1 biar hari pertama keitung cuti
                        let listDate = [];
                        let dateMove = new Date(date1);
                        let strDate = datestart;

                        while (strDate < dateend) {
                            strDate = dateMove.toISOString().slice(0, 10);
                            dateMove.setDate(dateMove.getDate() + 1);

                            let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

                            if (!checkDay) {
                                listDate.push(strDate);
                            }
                        }

                        // cek sisa jatah cuti reguler employee
                        if (data.left < diff - listDate.length) {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Jatah cuti kurang dari permintaan cuti'
                            });
                        } else {
                            callback(null, {
                                kode: data.kode,
                                days: diff - listDate.length,
                                typeid: data.typeid
                            });
                        }
                    }

                    // 1 = cuti khusus
                    else if (data.typeid == 1) {
                        let startDate = moment(datestart),
                            days = data.days - 1, // -1 biar hari pertama keitung cuti
                            defaultDays = startDate
                                .clone()
                                .add(days, 'days')
                                .format('YYYY-MM-DD'),
                            bussinessDays = startDate
                                .clone()
                                .businessAdd(days)
                                .format('YYYY-MM-DD');

                        callback(null, {
                            kode: data.kode,
                            days: data.days,
                            typeid: data.typeid,
                            dateend: bussinessDays
                        });
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            message: 'tipe cuti tidak tersedia'
                        });
                    }
                }
            },

            function checkTgl(result, callback) {
                console.log(result);

                APP.db.sequelize
                    .query(
                        `SELECT * FROM ${req.user.db}.absent_cuti
            WHERE
              user_id = ${req.user.id} 
            AND
              '${datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${dateend}' <= date_format(date_end, '%Y-%m-%d')
            OR
              user_id = ${req.user.id} 
            AND
              '${datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${datestart}' <= date_format(date_end, '%Y-%m-%d')
            OR
              user_id = ${req.user.id} 
            AND
              '${result.dateend ? result.dateend : dateend}' >= date_format(date_start, '%Y-%m-%d') AND '${
                            result.dateend ? result.dateend : dateend
                        }' <= date_format(date_end, '%Y-%m-%d')`
                    )
                    .then(res => {
                        if (res[0].length > 0) {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Sudah pernah absen atau cuti di tanggal ini'
                            });
                        } else {
                            callback(null, result);
                        }
                    })
                    .catch(err => {
                        console.log('Error function checkTgl', err);

                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error function checkTgl',
                            data: err
                        });
                    });
            },

            function uploadPath(data, callback) {
                trycatch(
                    () => {
                        if (!req.files || Object.keys(req.files).length === 0) {
                            return callback({
                                code: 'INVALID_REQUEST',
                                message: 'No files were uploaded.'
                            });
                        }

                        APP.fileCheck(req.files.doc_upload.tempFilePath, 'all').then(res => {
                            if (res == null) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'File yang diunggah tidak sesuai!'
                                });
                            } else {
                                let fileName = new Date().toISOString().replace(/:|\./g, '');
                                let docPath = `./public/uploads/company_${req.user.code}/employee/absen & cuti/`;

                                callback(null, {
                                    kode: data.kode,
                                    days: data.days,
                                    typeid: data.typeid,
                                    time: data.time,
                                    dateend: data.dateend,
                                    doc: docPath + fileName + path.extname(req.files.doc_upload.name)
                                });
                            }
                        });
                    },
                    err => {
                        console.log('Error uploadPath', err);

                        callback({
                            code: 'ERR',
                            data: err
                        });
                    }
                );
            },

            function uploadProcess(data, callback) {
                try {
                    // upload file
                    if (req.files.doc_upload) {
                        APP.cdn.uploadCDN(req.files.doc_upload, data.doc).then(res => {
                            if (res == false) {
                                callback({
                                    code: 'ERR',
                                    message: 'Error upload CDN!'
                                });
                            } else {
                                callback(null, data);
                            }
                        });
                    } else {
                        callback(null, data);
                    }
                } catch (err) {
                    console.log('Error uploadProcess', err);
                    callback({
                        code: 'ERR',
                        data: err
                    });
                }
            },

            function insertAbsentCuti(data, callback) {
                absent_cuti
                    .build({
                        code: data.kode,
                        type: type,
                        absent_cuti_type_id: typeid,
                        absent_cuti_type_code: codeid,
                        user_id: req.user.id,
                        date_start: datestart,
                        date_end: data.dateend ? data.dateend : dateend,
                        time_start: timestart,
                        time_end: timeend,
                        description: desc,
                        count: data.days,
                        time_total: data.time,
                        upload: data.doc.slice(8) // slice 8 buat ngilangin './public'
                    })
                    .save()
                    .then(result => {
                        let params = 'Insert Success'; //This is only example, Object can also be used
                        return callback(null, {
                            data: data,
                            row: result.dataValues
                        });
                    })
                    .catch(err => {
                        console.log('Error insertAbsentCuti', err);

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
            },

            function getDetails(result, callback) {
                let query;
                if (type == 0) {
                    query = absent_type;
                } else if (type == 1) {
                    query = cuti_type;
                }

                absent_cuti.belongsTo(query, {
                    targetKey: 'id',
                    foreignKey: 'absent_cuti_type_id'
                });

                absent_cuti.belongsTo(employee, {
                    targetKey: 'id',
                    foreignKey: 'user_id'
                });

                absent_cuti
                    .findOne({
                        include: [
                            {
                                model: query
                            },
                            {
                                model: employee,
                                attributes: ['id', 'nik', 'name', 'company_code', 'employee_code']
                            }
                        ],
                        where: {
                            id: result.row.id
                        }
                    })
                    .then(res => {
                        callback(null, res.dataValues);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function sendMailToAdmin(result, callback) {
                let reqtype = type == 0 ? result.absent_type : result.cuti_type;
                APP.models.mysql.admin
                    .findAll({
                        where: {
                            company_code: req.user.code
                        }
                    })
                    .then(res => {
                        if (res.length == 0) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'admin company tidak ditemukan'
                            });
                        } else {
                            let emailList = [];

                            res.map(data => {
                                emailList.push(data.email);
                            });
                            //send to email
                            APP.mailer.sendMail({
                                subject: 'New Leave Permission Request',
                                to: emailList,
                                company: req.user.code,
                                data: {
                                    name: result.employee.name,
                                    type: reqtype.name,
                                    datestart: moment(result.date_start).format('DD-MM-YYYY'),
                                    dateend: moment(result.date_end).format('DD-MM-YYYY'),
                                    count: result.count,
                                    desc: result.description
                                },
                                file: 'leave_permission.html'
                            });

                            callback(null, {
                                code: 'INSERT_SUCCESS',
                                data: result
                            });
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error function sendMailToAdmin',
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

exports.update = function(APP, req, callback) {
    let { absent_cuti, absent_type, cuti_type, employee, schedule } = APP.models.company[req.user.db].mysql;
    let { type, typeid, codeid, datestart, dateend, timestart, timeend, id, desc } = req.body;
    async.waterfall(
        [
            function checkBody(callback) {
                if (type && typeid && codeid && datestart && dateend && timestart && timeend) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter'
                    });
                }
            },

            function getDetails(result, callback) {
                absent_cuti
                    .findOne({
                        where: {
                            id: id
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Absen atau cuti tidak ditemukan'
                            });
                        } else {
                            if (res.status !== 0) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message:
                                        'Tidak bisa mengubah permintaan absen atau cuti karena permintaan sudah di approve atau di tolak'
                                });
                            } else {
                                if (req.user.level == 3) {
                                    if (res.user_id == req.user.id) {
                                        callback(null, res.dataValues);
                                    } else {
                                        callback({
                                            code: 'INVALID_REQUEST',
                                            message: 'Invalid Access!'
                                        });
                                    }
                                } else {
                                    callback(null, res.dataValues);
                                }
                            }
                        }
                    });
            },

            function checkType(result, callback) {
                if (type == 0) {
                    // 0 = absent
                    absent_type
                        .findOne({
                            where: {
                                id: typeid,
                                status: 1
                            }
                        })
                        .then(res => {
                            if (res === null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    message: 'Tipe absent tidak ditemukan.'
                                });
                            } else {
                                callback(null, {
                                    result: result,
                                    typeid: res.type
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error function checkType',
                                data: err
                            });
                        });
                } else if (type == 1) {
                    // 1 = cuti
                    cuti_type
                        .findOne({
                            where: {
                                id: typeid
                            }
                        })
                        .then(res => {
                            if (res === null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    message: 'Tipe cuti tidak ditemukan.'
                                });
                            } else {
                                callback(null, {
                                    result: result,
                                    typeid: res.type,
                                    days: res.days
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error function checkType',
                                data: err
                            });
                        });
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Tipe request tidak terdefinisi'
                    });
                }
            },

            function checkSchedule(result, callback) {
                employee.belongsTo(schedule, {
                    targetKey: 'id',
                    foreignKey: 'schedule_id'
                });

                employee
                    .findOne({
                        include: [
                            {
                                model: schedule,
                                attributes: ['id', 'name', 'description', 'work_day', 'work_time'],
                                required: true
                            }
                        ],
                        where: {
                            id: req.user.id,
                            status: 1
                        }
                    })
                    .then(res => {
                        if (res === null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Schedule tidak ditemukan.'
                            });
                        } else {
                            callback(null, {
                                result: result.result,
                                kode: result.kode,
                                typeid: result.typeid,
                                days: result.days,
                                left: res.total_cuti,
                                schedule: {
                                    workday: res.schedule.work_day,
                                    time: res.schedule.work_time
                                }
                            });
                        }
                    });
            },

            function checkDay(data, callback) {
                try {
                    moment.updateLocale('us', {
                        workingWeekdays: data.schedule.workday
                    });

                    // 0 = absent
                    if (type == 0) {
                        // ijin durasi hari
                        if (data.typeid == 1) {
                            let date1 = moment(datestart);
                            let date2 = moment(dateend);
                            let diff = date2.diff(date1, 'days') + 1; // +1 biar hari pertama keitung cuti
                            let listDate = [];
                            let dateMove = new Date(date1);
                            let strDate = datestart;

                            while (strDate < dateend) {
                                strDate = dateMove.toISOString().slice(0, 10);
                                dateMove.setDate(dateMove.getDate() + 1);
                                let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

                                if (!checkDay) {
                                    listDate.push(strDate);
                                }
                            }

                            let work_skip = APP.time.timeXday(data.schedule.time, diff);

                            return callback(null, {
                                result: data.result,
                                days: diff - listDate.length,
                                typeid: data.typeid,
                                time: work_skip
                            });
                        }

                        // ijin durasi jam
                        else if (data.typeid == 0) {
                            let date = datestart;
                            dateend = date;

                            callback(null, {
                                result: data.result,
                                days: 0,
                                typeid: data.typeid,
                                time: moment
                                    .utc(moment(timeend, 'HH:mm:ss').diff(moment(timestart, 'HH:mm:ss')))
                                    .format('HH:mm:ss')
                            });
                        } else {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Tipe absent tidak tersedia'
                            });
                        }
                    }

                    // 1 = cuti
                    else if (type == 1) {
                        // 0 = cuti reguler
                        if (data.typeid == 0) {
                            let date1 = moment(datestart);
                            let date2 = moment(dateend);
                            let diff = date2.diff(date1, 'days') + 1; // +1 biar hari pertama keitung cuti
                            let listDate = [];
                            let dateMove = new Date(date1);
                            let strDate = datestart;

                            while (strDate < dateend) {
                                strDate = dateMove.toISOString().slice(0, 10);
                                dateMove.setDate(dateMove.getDate() + 1);

                                let checkDay = moment(strDate, 'YYYY-MM-DD').isBusinessDay();

                                if (!checkDay) {
                                    listDate.push(strDate);
                                }
                            }

                            // cek sisa jatah cuti reguler employee
                            if (data.left < diff - listDate.length) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'Jatah cuti kurang dari permintaan cuti'
                                });
                            } else {
                                callback(null, {
                                    result: data.result,
                                    days: diff - listDate.length,
                                    typeid: data.typeid
                                });
                            }
                        }

                        // 1 = cuti khusus
                        else if (data.typeid == 1) {
                            let startDate = moment(datestart),
                                days = data.days - 1, // -1 biar hari pertama keitung cuti
                                defaultDays = startDate
                                    .clone()
                                    .add(days, 'days')
                                    .format('YYYY-MM-DD'),
                                bussinessDays = startDate
                                    .clone()
                                    .businessAdd(days)
                                    .format('YYYY-MM-DD');

                            callback(null, {
                                result: data.result,
                                days: data.days,
                                typeid: data.typeid,
                                dateend: bussinessDays
                            });
                        } else {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Tipe cuti tidak tersedia'
                            });
                        }
                    }
                } catch (err) {
                    console.log(err);
                    callback({
                        code: 'ERR',
                        data: err
                    });
                }
            },

            function checkTgl(result, callback) {
                let customDateend = result.dateend ? result.dateend : dateend;
                if (
                    result.result.date_start.getTime() == new Date(datestart).getTime() &&
                    result.result.date_end.getTime() == new Date(customDateend).getTime()
                ) {
                    callback(null, result);
                } else {
                    APP.db.sequelize
                        .query(
                            `SELECT * FROM ${req.user.db}.absent_cuti
              WHERE
                user_id = ${req.user.id} 
              AND
                '${datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${customDateend}' <= date_format(date_end, '%Y-%m-%d')
              OR
                '${datestart}' >= date_format(date_start, '%Y-%m-%d') AND '${datestart}' <= date_format(date_end, '%Y-%m-%d')
              OR
                '${result.dateend ? result.dateend : customDateend}' >= date_format(date_start, '%Y-%m-%d') AND '${
                                result.dateend ? result.dateend : customDateend
                            }' <= date_format(date_end, '%Y-%m-%d')`
                        )
                        .then(res => {
                            if (res[0].length > 0) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'Sudah pernah absen atau cuti di tanggal ini'
                                });
                            } else {
                                callback(null, result);
                            }
                        })
                        .catch(err => {
                            console.log('Error function checkTgl', err);

                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error function checkTgl',
                                data: err
                            });
                        });
                }
            },

            function uploadPath(data, callback) {
                trycatch(
                    () => {
                        if (data.result.absent_cuti_type_code == codeid) {
                            console.log('gausah upload');

                            callback(null, {
                                days: data.days,
                                typeid: data.typeid,
                                time: data.time,
                                dateend: data.dateend,
                                doc: data.result.upload,
                                upload: false
                            });
                        } else {
                            console.log('upload sek bro');
                            if (!req.files || Object.keys(req.files).length === 0) {
                                return callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'No files were uploaded.'
                                });
                            }

                            APP.fileCheck(req.files.doc_upload.tempFilePath, 'all').then(res => {
                                if (res == null) {
                                    callback({
                                        code: 'INVALID_REQUEST',
                                        message: 'File yang diunggah tidak sesuai!'
                                    });
                                } else {
                                    let fileName = new Date().toISOString().replace(/:|\./g, '');
                                    let docPath = `./public/uploads/company_${req.user.code}/employee/absen & cuti/`;

                                    callback(null, {
                                        days: data.days,
                                        typeid: data.typeid,
                                        time: data.time,
                                        dateend: data.dateend,
                                        doc: docPath + fileName + path.extname(req.files.doc_upload.name),
                                        upload: true
                                    });
                                }
                            });
                        }
                    },
                    err => {
                        console.log('Error uploadPath', err);

                        callback({
                            code: 'ERR',
                            data: err
                        });
                    }
                );
            },

            function uploadProcess(data, callback) {
                try {
                    // upload file
                    if (req.files.doc_upload) {
                        APP.cdn.uploadCDN(req.files.doc_upload, data.doc).then(res => {
                            if (res.error == true) {
                                callback({
                                    code: 'ERR',
                                    data: res.data
                                });
                            } else {
                                callback(null, data);
                            }
                        });
                    } else {
                        callback(null, data);
                    }
                } catch (err) {
                    console.log('Error uploadProcess', err);
                    callback({
                        code: 'ERR',
                        data: err
                    });
                }
            },

            function updateAbsentCuti(data, callback) {
                absent_cuti
                    .update(
                        {
                            type: type,
                            absent_cuti_type_id: typeid,
                            absent_cuti_type_code: codeid,
                            user_id: req.user.id,
                            date_start: datestart,
                            date_end: data.dateend ? data.dateend : dateend,
                            time_start: timestart,
                            time_end: timeend,
                            description: desc,
                            count: data.days,
                            time_total: data.time,
                            // status: status, // 0 = requested 1 = approved, 2 = reject
                            upload: data.upload ? data.doc.slice(8) : data.doc // slice 8 buat ngilangin './public'
                        },
                        {
                            where: {
                                id: req.body.id
                            }
                        }
                    )
                    .then(result => {
                        callback(null, {
                            code: 'UPDATE_SUCCESS',
                            data: data,
                            row: result.dataValues
                        });
                    })
                    .catch(err => {
                        console.log('Error updateAbsentCuti', err);

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
            }
        ],
        (err, result) => {
            if (err) return callback(err);

            callback(null, result);
        }
    );
};

exports.delete = function(APP, req, callback) {
    async.waterfall(
        [
            function checkBody(callback) {
                if (req.body.id) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter!'
                    });
                }
            },

            function getDetails(data, callback) {
                APP.models.company[req.user.db].mysql.absent_cuti
                    .findOne({
                        where: {
                            id: req.body.id
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            return callback({
                                code: 'NOT_FOUND',
                                message: 'Data absen atau cuti tidak ditemukan'
                            });
                        }

                        if (res.status !== 0) {
                            return callback({
                                code: 'INVALID_REQUEST',
                                message:
                                    'Tidak bisa menghapus permintaan absen atau cuti karena permintaan sudah di approve atau di tolak'
                            });
                        } else {
                            if (req.user.level == 3) {
                                if (res.user_id == req.user.id) {
                                    callback(null, res);
                                } else {
                                    callback({
                                        code: 'INVALID_REQUEST',
                                        message: 'Invalid Access!'
                                    });
                                }
                            } else {
                                callback(null, res);
                            }
                        }
                    })
                    .catch(err => {
                        console.log('error findOne', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error findOne',
                            data: err
                        });
                    });
            },

            function deleteReq(data, callback) {
                data.destroy()
                    .then(() => {
                        return callback(null, {
                            code: 'DELETE_SUCCESS'
                        });
                    })
                    .catch(err => {
                        console.log('error destroy', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error destroy',
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

exports.updateStatus = (APP, req, callback) => {
    let { absent_cuti, cuti_type, employee } = APP.models.company[req.user.db].mysql;
    APP.db.sequelize.transaction().then(t => {
        async.waterfall(
            [
                function updateStatus(callback) {
                    absent_cuti.belongsTo(employee, {
                        targetKey: 'id',
                        foreignKey: 'user_id'
                    });

                    absent_cuti
                        .findOne(
                            {
                                include: [
                                    {
                                        model: employee,
                                        attributes: ['total_cuti']
                                    }
                                ],
                                where: {
                                    id: req.body.id
                                }
                            },
                            { transaction: t }
                        )
                        .then(res => {
                            if (res == null) {
                                return callback({
                                    code: 'NOT_FOUND',
                                    message: 'Absen atau cuti tidak ditemukan'
                                });
                            } else {
                                if (res.status !== 0) {
                                    return callback({
                                        code: 'INVALID_REQUEST',
                                        message:
                                            'Tidak bisa mengubah permintaan absen atau cuti karena permintaan sudah di approve atau di tolak'
                                    });
                                } else {
                                    res.update({
                                        status: req.body.status, // 0 = requested 1 = approved, 2 = reject
                                        notes: req.body.notes,
                                        updated_at: new Date(),
                                        action_by: req.user.id
                                    })
                                        .then(updated => {
                                            callback(null, updated);
                                        })
                                        .catch(err => {
                                            console.log('error update', err);
                                            callback({
                                                code: 'ERR_DATABASE',
                                                message: 'Error update function updateStatus',
                                                data: err
                                            });
                                        });
                                }
                            }
                        })
                        .catch(err => {
                            console.log('error findOne', err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error findOne function updateStatus',
                                data: err
                            });
                        });
                },

                function updateSisaCuti(result, callback) {
                    // if absent
                    if (result.type == 0) {
                        callback(null, {
                            code: 'UPDATE_SUCCESS',
                            data: result
                        });
                        // if cuti
                    } else {
                        cuti_type
                            .findOne({
                                where: {
                                    id: result.absent_cuti_type_id
                                }
                            })
                            .then(res => {
                                if (res.days == 0) {
                                    employee
                                        .update(
                                            {
                                                total_cuti: result.employee.total_cuti - result.count
                                            },
                                            {
                                                where: {
                                                    id: result.user_id
                                                }
                                            },
                                            { transaction: t }
                                        )
                                        .then(() => {
                                            console.log('cuti reguler');
                                            callback(null, {
                                                code: 'UPDATE_SUCCESS',
                                                data: result
                                            });
                                        })
                                        .catch(err => {
                                            console.log('Error update function updateSisaCuti', err);

                                            callback({
                                                code: 'ERR_DATABASE',
                                                message: 'Error update function updateSisaCuti',
                                                data: err
                                            });
                                        });
                                } else {
                                    console.log('cuti khusus');

                                    callback(null, {
                                        code: 'UPDATE_SUCCESS',
                                        data: result
                                    });
                                }
                            })
                            .catch(err => {
                                console.log('Error findOne function updateSisaCuti', err);

                                callback({
                                    code: 'ERR_DATABASE',
                                    message: 'Error findOne function updateSisaCuti',
                                    data: err
                                });
                            });
                    }
                }
            ],
            (err, result) => {
                if (err) {
                    t.rollback();
                    return callback(err);
                }
                t.commit();
                callback(null, result);
            }
        );
    });
};
