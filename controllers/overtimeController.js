'use strict';

const async = require('async');
const moment = require('moment');
const path = require('path');

exports.overtimeRequest = (APP, req, callback) => {
    let { overtime, grade, department, employee, overtime_setting } = APP.models.company[req.user.db].mysql;
    let { department_id, datestart, dateend, details } = req.body;
    async.waterfall(
        [
            function checkLevel(callback) {
                if (req.user.level === 3) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: '?',
                        message: 'Invalid user level'
                    });
                }
            },

            function checkParams(data, callback) {
                if (department_id && datestart && dateend && details) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: 'IRQ96',
                        message: 'Kesalahan pada parameter'
                    });
                }
            },

            function checkGrade(data, callback) {
                overtime_setting.belongsTo(grade, {
                    targetKey: 'id',
                    foreignKey: 'value'
                });

                overtime_setting
                    .findOne({
                        include: [
                            {
                                model: grade,
                                attributes: ['id', 'name', 'description']
                            }
                        ],
                        where: {
                            overtime_setting_id: 1
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                id: 'IRQ97',
                                message: 'Setting Tidak ditemukan'
                            });
                        } else {
                            if (res.grade.id == req.user.grade) {
                                callback(null, true);
                            } else {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    id: '?',
                                    message: 'Grade tidak sesuai untuk melakukan request overtime!'
                                });
                            }
                        }
                    });
            },

            function checkDepartment(data, callback) {
                department
                    .findOne({
                        where: {
                            id: department_id
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                id: 'IRQ97',
                                message: 'Department Tidak ditemukan'
                            });
                        } else {
                            callback(null, res.dataValues);
                        }
                    })
                    .catch(err => {
                        console.log('Error checkDepartment', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                            data: err
                        });
                    });
            },

            function checkEmployee(data, callback) {
                Promise.all(
                    details.map(x => {
                        return x.user_id;
                    })
                ).then(arr => {
                    employee
                        .findAll({
                            where: {
                                id: arr
                            }
                        })
                        .then(res => {
                            if (res.length == 0) {
                                callback({
                                    code: 'NOT_FOUND',
                                    id: 'IRQ97',
                                    message: 'Employee Tidak ditemukan'
                                });
                            } else {
                                callback(null, {
                                    department: data,
                                    employee: res.dataValues
                                });
                            }
                        })
                        .catch(err => {
                            console.log('Error checkEmployee', err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                                data: err
                            });
                        });
                });
            },

            function generateCode(data, callback) {
                let kode = APP.generateCode(overtime, 'OT');
                Promise.resolve(kode)
                    .then(x => {
                        callback(null, {
                            department: data.department,
                            employee: data.employee,
                            code: x
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            id: 'BSP01',
                            message: 'Terjadi Kesalahan, mohon coba kembali',
                            data: err
                        });
                    });
            },

            function insertOvertime(data, callback) {
                Promise.all(
                    details.map(x => {
                        let obj = {};

                        obj.code = data.code;
                        obj.department_id = department_id;
                        obj.date_start = datestart;
                        obj.date_end = dateend;
                        obj.user_id = x.user_id;
                        obj.name = x.name;
                        obj.description = x.desc;
                        obj.time_start = x.timestart;
                        obj.time_end = x.timeend;
                        obj.created_by = req.user.id;

                        return obj;
                    })
                ).then(arr => {
                    overtime
                        .bulkCreate(arr)
                        .then(res => {
                            callback(null, {
                                code: 'INSERT_SUCCESS',
                                id: 'IRP00',
                                message: 'Initial Request Overtime berhasil dikriim',
                                data: res
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR',
                                id: 'IRQ98',
                                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.overtimeApproval = (APP, req, callback) => {
    if (req.user.level == 2) {
        let { overtime, employee } = APP.models.company[req.user.db].mysql;
        let { status, notes, id } = req.body;

        async.waterfall(
            [
                function checkParam(callback) {
                    if (status && notes && id) {
                        callback(null, true);
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            id: 'ALQ96',
                            message: 'Kesalahan pada parameter'
                        });
                    }
                },

                function getCurretData(data, callback) {
                    overtime
                        .findOne({
                            where: {
                                id: id
                            }
                        })
                        .then(res => {
                            if (res == null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    id: 'ALQ97',
                                    message: 'Data Tidak ditemukan'
                                });
                            } else {
                                callback(null, res.dataValues);
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                id: 'ALQ98',
                                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
                            });
                        });
                },

                function getRequesterEmail(data, callback) {
                    employee
                        .findOne({
                            where: {
                                id: data.created_by
                            }
                        })
                        .then(res => {
                            if (res == null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    id: 'ALQ97',
                                    message: 'Employee Tidak ditemukan'
                                });
                            } else {
                                callback(null, {
                                    details: data,
                                    email: res.dataValues.email
                                });
                            }
                        });
                },

                function updateApproval(data, callback) {
                    overtime
                        .update(
                            {
                                status: status,
                                notes: notes,
                                approved_by: req.user.id,
                                approved_at: new Date()
                            },
                            {
                                where: {
                                    id: id,
                                    status: 0 // pending
                                }
                            }
                        )
                        .then(updated => {
                            callback(null, {
                                email: data.email,
                                details: data.details,
                                updated: updated
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                id: 'ALQ98',
                                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
                            });
                        });
                },

                function sendMail(data, callback) {
                    try {
                        APP.mailer.sendMail({
                            subject: 'Overtime Approval',
                            to: data.email,
                            data: {
                                data: data.details
                            },
                            file: 'overtime_approval.html'
                        });

                        callback(null, {
                            code: 'UPDATE_SUCCESS',
                            id: 'ALP00',
                            message: 'Proses approval lembur berhasil',
                            data: data.updated
                        });
                    } catch (err) {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            id: 'BSP01',
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
    } else {
        callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid user level'
        });
    }
};

exports.finishingOvertime = (APP, req, callback) => {
    if (req.user.level === 3) {
        let { overtime, employee } = APP.models.company[req.user.db].mysql;
        let { status, result, id } = req.body;

        async.waterfall(
            [
                function checkParams(callback) {
                    if (result && id) {
                        callback(null, true);
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            id: 'FLQ96',
                            message: 'Kesalahan pada parameter'
                        });
                    }
                },

                function uploadPath(data, callback) {
                    try {
                        if (!req.files || Object.keys(req.files).length === 0) {
                            return callback({
                                code: 'INVALID_REQUEST',
                                id: 'FLQ96',
                                message: 'Kesalahan pada parameter upload'
                            });
                        }

                        APP.fileCheck(req.files.upload.tempFilePath, 'doc').then(res => {
                            if (res == null) {
                                callback({
                                    code: 'INVALID_REQUEST',
                                    message: 'File yang diunggah tidak sesuai!'
                                });
                            } else {
                                let fileName = new Date().toISOString().replace(/:|\./g, '');
                                let docPath = `./public/uploads/company_${req.user.code}/overtime/`;

                                callback(null, {
                                    doc: docPath + fileName + path.extname(req.files.upload.name)
                                });
                            }
                        });
                    } catch (err) {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            id: 'FLP01',
                            message: 'Terjadi Kesalahan, mohon coba kembali',
                            data: err
                        });
                    }
                },

                function uploadProcess(data, callback) {
                    try {
                        // upload file
                        if (req.files.upload) {
                            APP.cdn.uploadCDN(req.files.upload, data.doc).then(res => {
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

                function finishingOvertime(data, callback) {
                    overtime
                        .findOne({
                            where: {
                                id: id,
                                status: 1 // approved
                            }
                        })
                        .then(res => {
                            if (res == null) {
                                callback({
                                    code: 'NOT_FOUND',
                                    id: 'FLQ97',
                                    message: 'Data Tidak ditemukan'
                                });
                            } else {
                                let timeTotal = APP.time.timeDuration(
                                    moment().diff(moment(res.date_start + ' ' + res.time_start))
                                );

                                res.update({
                                    date_finish: new Date(),
                                    time_finish: new Date(),
                                    result: result,
                                    status: 3, // finished
                                    upload: data.doc.slice(8), // slice 8 buat hilangin /public
                                    time_total: timeTotal
                                })
                                    .then(res => {
                                        callback(null, {
                                            code: 'UPDATE_SUCCESS',
                                            id: 'FLP00',
                                            message: 'Proses finish lembur berhasil',
                                            data: res
                                        });
                                    })
                                    .catch(err => {
                                        console.log('Error update finishingOvertime', err);
                                        callback({
                                            code: 'ERR_DATABASE',
                                            id: 'FLQ98',
                                            message:
                                                'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
                                        });
                                    });
                            }
                        })
                        .catch(err => {
                            console.log('Error findOne finishingOvertime', err);
                            callback({
                                code: 'ERR_DATABASE',
                                id: 'FLQ98',
                                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami'
                            });
                        });
                }
            ],
            (err, result) => {
                if (err) return callback(err);

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

exports.viewOvertimeData = (APP, req, callback) => {
    let { overtime, employee, department, overtime_setting } = APP.models.company[req.user.db].mysql;
    let { datestart, dateend, department_id, status, limit, offset } = req.body;

    async.waterfall(
        [
            function getSettingsGrade(callback) {
                overtime_setting
                    .findOne({
                        attributes: ['value'],
                        where: { overtime_setting_id: 1 }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Setting not found!'
                            });
                        } else {
                            callback(null, res);
                        }
                    })
                    .catch(err => {
                        console.log('Error getSettingsGrade', err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function checkEmployeeGrade(data, callback) {
                if (req.user.level == 2) return callback(null, true);

                employee
                    .findOne({
                        attributes: ['grade_id'],
                        where: { id: req.user.id }
                    })
                    .then(res => {
                        if (res == null) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Employee not found!'
                            });
                        } else {
                            callback(null, {
                                valid: res.grade_id == data.value ? 1 : 0
                            });
                        }
                    })
                    .catch(err => {
                        console.log('Error checkEmployeeGrade', err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function getData(data, callback) {
                let where = {};
                if (datestart && dateend) {
                    where.$or = [
                        {
                            date_start: {
                                $between: [datestart, dateend]
                            }
                        },
                        {
                            date_end: {
                                $between: [datestart, dateend]
                            }
                        }
                    ];
                }

                if (department_id) {
                    where.department_id = department_id;
                }

                if (status) {
                    where.status = status;
                }

                if (req.user.level === 3) {
                    where.$or = [
                        {
                            user_id: req.user.id
                        },
                        {
                            created_by: req.user.id
                        }
                    ];
                }

                overtime.belongsTo(department, {
                    targetKey: 'id',
                    foreignKey: 'department_id'
                });

                overtime.belongsTo(employee, {
                    targetKey: 'id',
                    foreignKey: 'user_id'
                });

                overtime
                    .findAll({
                        attributes: {
                            include: [
                                [
                                    APP.db.sequelize.literal(
                                        `CASE WHEN overtime.created_by = ${req.user.id} THEN 1 ELSE 2 END`
                                    ),
                                    'requester'
                                ]
                            ]
                        },
                        include: [
                            {
                                model: department,
                                attributes: ['id', 'code', 'name', 'description']
                            },
                            {
                                model: employee,
                                attributes: ['id', 'employee_code', 'nik', 'name']
                            }
                        ],
                        where: where,
                        limit: limit && offset ? limit : null,
                        offset: limit && offset ? offset : null,
                        order: [['id', 'DESC']]
                    })
                    .then(res => {
                        if (res.length == 0) {
                            callback({
                                code: 'NOT_FOUND',
                                id: 'VOQ97',
                                message: 'Data Tidak ditemukan'
                            });
                        } else {
                            callback(null, {
                                code: 'FOUND',
                                id: 'VOP00',
                                message: 'List data lembur ditemukan',
                                data: {
                                    valid: data.valid,
                                    rows: res
                                }
                            });
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            id: 'VOQ98',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
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

exports.viewDetailOvertimeData = (APP, req, callback) => {
    let where = '';
    if (req.user.level == 2) {
        if (!req.body.id) {
            callback({
                code: 'INVALID_REQUEST',
                id: 'DOQ96',
                message: 'Kesalahan pada parameter'
            });
        }

        where = `WHERE overtime.id = ${req.body.id}`;
    }

    if (req.user.level == 3) {
        where = `WHERE (employee.id = ${req.user.id} OR requester.id = ${req.user.id}) AND overtime.id = ${req.body.id}`;
    }

    APP.db.sequelize
        .query(
            `
  SELECT 
    overtime.*,
    department.id AS 'department_id',
    department.code AS 'department_code',
    department.name AS 'department_name',
    department.description AS 'department_desc',
    employee.id AS 'employee_id',
    employee.employee_code AS 'employee_code',
    employee.nik AS 'employee_nik',
    employee.name AS 'employee_name',
    employee.photo AS 'employee_photo',
    requester.id AS 'requester_id',
    requester.employee_code AS 'requester_code',
    requester.nik AS 'requester_nik',
    requester.name AS 'requester_name',
    requester.photo AS 'requester_photo',
    approver.id AS 'approver_id',
    approver.name AS 'approver_name',
    approver.photo AS 'approver_photo'
  FROM 
    ${req.user.db}.overtime AS overtime 
  LEFT OUTER JOIN 
    ${req.user.db}.department AS department 
  ON 
    overtime.department_id = department.id 
  LEFT OUTER JOIN 
    ${req.user.db}.employee AS employee 
  ON 
    overtime.user_id = employee.id 
  LEFT OUTER JOIN 
    ${req.user.db}.employee AS requester 
  ON 
    overtime.created_by = requester.id 
  LEFT OUTER JOIN 
    ${process.env.MYSQL_NAME}.admin AS approver 
  ON 
    overtime.approved_by = approver.id 
  ${where}
  `
        )
        .then(res => {
            if (res[0].length == 0) {
                callback({
                    code: 'NOT_FOUND',
                    id: 'DOQ97',
                    message: 'Data Tidak ditemukan'
                });
            } else {
                callback(null, {
                    code: 'FOUND',
                    id: 'DOP00',
                    message: 'Detail lembur ditemukan',
                    data: res[0][0]
                });
            }
        })
        .catch(err => {
            console.log(err);
            callback({
                code: 'ERR_DATABASE',
                id: 'DOQ98',
                message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                data: err
            });
        });
};

exports.getOvertimeSetting = (APP, req, callback) => {
    async.waterfall(
        [
            function getData(callback) {
                let attr = req.user.level == 2 ? ", setting.id 'setting_id', setting.value" : '';
                let join =
                    req.user.level == 2
                        ? `LEFT JOIN ${req.user.db}.overtime_setting setting ON setting.overtime_setting_id = master.id`
                        : '';

                APP.db.sequelize
                    .query(
                        `
            SELECT 
              master.*
              ${attr}
            FROM 
              ${process.env.MYSQL_NAME}.overtime_setting_master master
            ${join}
            WHERE
              master.status = 1
            `
                    )
                    .then(res => {
                        if (res[0].length == 0) {
                            callback({
                                code: 'NOT_FOUND',
                                message: 'Data tidak ditemukan!'
                            });
                        } else {
                            callback(null, res[0]);
                        }
                    });
            },

            function checkData(data, callback) {
                console.log(data);
                Promise.all(
                    data.map(x => {
                        if (x.data == null && (x.data_model !== null && x.data_model !== '')) {
                            return APP.models.company[req.user.db].mysql[x.data_model]
                                .findAll({
                                    attributes: ['id', 'name', 'description']
                                })
                                .then(res => {
                                    x.data = res;
                                })
                                .catch(err => {
                                    throw new Error(err.message);
                                });
                        }
                    })
                )
                    .then(() => {
                        callback(null, {
                            code: 'FOUND',
                            data: data
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            message: err.message,
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

exports.overtimeSettings = (APP, req, callback) => {
    if (req.user.level === 1) {
        let { overtime_setting_master } = APP.models.mysql;
        let { settings } = req.body;

        if (!settings) {
            callback({
                code: 'INVALID_REQUEST',
                id: 'SOQ96',
                message: 'Kesalahan pada parameter'
            });
        } else {
            Promise.all(
                settings.map((x, index) => {
                    let obj = {};

                    obj.name = settings[index].name;
                    obj.description = settings[index].desc;
                    obj.type = settings[index].type;
                    obj.html = settings[index].html;
                    obj.data = settings[index].data;
                    obj.data_model = settings[index].data_model;

                    return obj;
                })
            ).then(arr => {
                overtime_setting_master
                    .bulkCreate(arr)
                    .then(res => {
                        callback(null, {
                            code: 'INSERT_SUCCESS',
                            id: 'SOP00',
                            message: 'Setting Overtime berhasil diubah',
                            data: res
                        });
                    })
                    .catch(err => {
                        console.log('Error addSetting', err);
                        callback({
                            code: 'ERR_DATABASE',
                            id: 'SOQ98',
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

exports.overtimeSettingsCompany = (APP, req, callback) => {
    if (req.user.level === 2) {
        let { overtime_setting_master } = APP.models.mysql;
        let { overtime_setting } = APP.models.company[req.user.db].mysql;
        let { type, value } = req.body;

        async.waterfall(
            [
                function checkParam(callback) {
                    if (type && value) {
                        callback(null, true);
                    } else {
                        callback({
                            code: 'INVALID_REQUEST',
                            id: 'SOQ96',
                            message: 'Kesalahan pada parameter'
                        });
                    }
                },

                function checkovertimeType(data, callback) {
                    overtime_setting_master
                        .findOne({
                            where: {
                                id: type
                            }
                        })
                        .then(res => {
                            if (res == null) {
                                return callback({
                                    code: 'NOT_FOUND',
                                    message: 'overtime_setting_master tidak ditemukan'
                                });
                            }
                            callback(null, true);
                        })
                        .catch(err => {
                            console.log('Error checkovertimeType', err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error checkovertimeType',
                                data: err
                            });
                        });
                },

                function checkCurrentData(data, callback) {
                    overtime_setting
                        .count({
                            where: { overtime_setting_id: type }
                        })
                        .then(res => {
                            console.log(res);
                            callback(null, res);
                        })
                        .catch(err => {
                            console.log(err);
                            callback({
                                code: 'ERR_DATABASE',
                                data: err
                            });
                        });
                },

                function addSettings(data, callback) {
                    // insert
                    if (data == 0) {
                        overtime_setting
                            .create({
                                overtime_setting_id: type,
                                value: value
                            })
                            .then(res => {
                                callback(null, {
                                    code: 'INSERT_SUCCESS',
                                    id: 'SOP00',
                                    message: 'Setting Overtime berhasil diubah',
                                    data: res
                                });
                            })
                            .catch(err => {
                                console.log('Error addSetting', err);
                                callback({
                                    code: 'ERR_DATABASE',
                                    id: 'SOQ98',
                                    message:
                                        'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                                    data: err
                                });
                            });
                    } else {
                        // update

                        overtime_setting
                            .update(
                                {
                                    value: value
                                },
                                {
                                    where: {
                                        overtime_setting_id: type
                                    }
                                }
                            )
                            .then(res => {
                                callback(null, {
                                    code: 'UPDATE_SUCCESS',
                                    id: 'SOP00',
                                    message: 'Setting Overtime berhasil diubah',
                                    data: res
                                });
                            })
                            .catch(err => {
                                console.log('Error addSetting', err);
                                callback({
                                    code: 'ERR_DATABASE',
                                    id: 'SOQ98',
                                    message:
                                        'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                                    data: err
                                });
                            });
                    }
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
