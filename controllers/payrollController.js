'use strict';

const async = require('async');
const moment = require('moment');
const path = require('path');
const presence_monthly = require('../models/template/presence_monthly');
const { callbackPromise } = require('nodemailer/lib/shared');

exports.getPayrollSetting = (APP, req, callback) => {
    async.waterfall(
        [
            function getData(callback) {
                let attr = req.user.level == 2 ? ", setting.id 'setting_id', setting.value" : '';
                let join =
                    req.user.level == 2
                        ? `LEFT JOIN ${req.user.db}.payroll_setting setting ON setting.payroll_setting_id = master.id`
                        : '';

                APP.db.sequelize
                    .query(
                        `
              SELECT 
                master.*
                ${attr}
              FROM 
                ${process.env.MYSQL_NAME}.payroll_setting_master master
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
                Promise.all(
                    data.map(x => {
                        if (x.data == null && x.data_model !== null) {
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

exports.payrollSettings = (APP, req, callback) => {
    if (req.user.level === 1) {
        let { payroll_setting_master } = APP.models.mysql;
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
                payroll_setting_master
                    .bulkCreate(arr)
                    .then(res => {
                        callback(null, {
                            code: 'INSERT_SUCCESS',
                            id: 'SOP00',
                            message: 'Setting payroll berhasil diubah',
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

exports.payrollSettingsCompany = (APP, req, callback) => {
    if (req.user.level === 2) {
        let { payroll_setting_master } = APP.models.mysql;
        let { payroll_setting } = APP.models.company[req.user.db].mysql;
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

                function checkpayrollType(data, callback) {
                    payroll_setting_master
                        .findOne({
                            where: {
                                id: type
                            }
                        })
                        .then(res => {
                            if (res == null) {
                                return callback({
                                    code: 'NOT_FOUND',
                                    message: 'payroll_setting_master tidak ditemukan'
                                });
                            }
                            callback(null, true);
                        })
                        .catch(err => {
                            console.log('Error checkpayrollType', err);
                            callback({
                                code: 'ERR_DATABASE',
                                message: 'Error checkpayrollType',
                                data: err
                            });
                        });
                },

                function checkCurrentData(data, callback) {
                    payroll_setting
                        .count({
                            where: { payroll_setting_id: type }
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
                        payroll_setting
                            .create({
                                payroll_setting_id: type,
                                value: value
                            })
                            .then(res => {
                                callback(null, {
                                    code: 'INSERT_SUCCESS',
                                    id: 'SOP00',
                                    message: 'Setting payroll berhasil diubah',
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

                        payroll_setting
                            .update(
                                {
                                    value: value
                                },
                                {
                                    where: {
                                        payroll_setting_id: type
                                    }
                                }
                            )
                            .then(res => {
                                callback(null, {
                                    code: 'UPDATE_SUCCESS',
                                    id: 'SOP00',
                                    message: 'Setting payroll berhasil diubah',
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

exports.getPayrollPaymentCompany = (APP, req, callback) => {
    let { payroll_payment_active } = APP.models.mysql;

    payroll_payment_active
        .findAll({
            where: {
                status: 1
            }
        })
        .then(res => {
            callback(null, {
                code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.getDetailPayrollPaymentCompany = (APP, req, callback) => {
    if (!req.body.id) {
        return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
        });
    }

    let { payroll_payment_active } = APP.models.mysql;

    payroll_payment_active
        .findOne({
            where: {
                id: req.body.id,
                status: 1
            }
        })
        .then(res => {
            callback(null, {
                code: res && res.length > 0 ? 'FOUND' : 'NOT_FOUND',
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

exports.addPayrollPaymentCompany = (APP, req, callback) => {
    let { payroll_payment_active } = APP.models.mysql;
    let { name, desc, payroll_payment_id, message, rek_no, rek_name } = req.body;

    async.waterfall(
        [
            function checkBody(callback) {
                if (!name)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter name!'
                    });

                if (!desc)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter desc!'
                    });

                if (!payroll_payment_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter payroll_payment_id!'
                    });

                if (!message)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter message!'
                    });

                if (!rek_no)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter rek_no!'
                    });

                if (!rek_name)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter rek_name!'
                    });

                callback(null, true);
            },

            function createNew(data, callback) {
                payroll_payment_active
                    .create({
                        payroll_payment_id: payroll_payment_id,
                        name: name,
                        description: desc.toString(),
                        to_rek_name: rek_name,
                        to_rek_no: rek_no,
                        message: message,
                        created_by: req.user.id
                    })
                    .then(res => {
                        callback(null, {
                            code: 'INSERT_SUCCESS',
                            id: 'APP00',
                            message: 'Payroll Payment berhasil ditambahkan!',
                            data: res
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            id: 'APQ98',
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

exports.editPayrollPaymentCompany = (APP, req, callback) => {
    let { payroll_payment_active } = APP.models.mysql;
    let { id, name, desc, status, payroll_payment_id, message, rek_no, rek_name } = req.body;

    async.waterfall(
        [
            function checkBody(callback) {
                if (!id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter id!'
                    });

                if (!name)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter name!'
                    });

                if (!desc)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter desc!'
                    });

                if (!status)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter status!'
                    });

                if (!payroll_payment_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter payroll_payment_id!'
                    });

                if (!message)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter message!'
                    });

                if (!rek_no)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter rek_no!'
                    });

                if (!rek_name)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter rek_name!'
                    });

                callback(null, true);
            },

            function checkCurrentData(data, callback) {
                payroll_payment_active
                    .findOne({
                        where: {
                            id: id
                        }
                    })
                    .then(res => {
                        if (res == null) {
                            return callback({
                                code: 'NOT_FOUND',
                                message: 'Data tidak ditemukan!'
                            });
                        }

                        callback(null, res.dataValues);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: '',
                            data: err
                        });
                    });
            },

            function updatePayrollPayment(data, callback) {
                payroll_payment_active
                    .update(
                        {
                            payroll_payment_id: payroll_payment_id,
                            name: name,
                            description: desc.toString(),
                            to_rek_name: rek_name,
                            to_rek_no: rek_no,
                            message: message,
                            status: status,
                            updated_at: new Date(),
                            updated_by: req.user.id
                        },
                        {
                            where: {
                                id: id
                            }
                        }
                    )
                    .then(res => {
                        callback(null, {
                            code: 'INSERT_SUCCESS',
                            message: 'Service berhasil diubah!',
                            data: res
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
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

exports.deletePayrollPaymentCompany = function(APP, req, callback) {
    let { payroll_payment_active } = APP.models.mysql;
    async.waterfall(
        [
            function checkBody(callback) {
                if (req.body.id) {
                    callback(null, true);
                } else {
                    callback({
                        code: 'INVALID_REQUEST',
                        id: '?',
                        message: 'Kesalahan pada parameter id'
                    });
                }
            },

            function softDelete(data, callback) {
                payroll_payment_active
                    .update(
                        {
                            status: 0
                        },
                        {
                            where: {
                                id: req.body.id
                            }
                        }
                    )
                    .then(updated => {
                        if (updated.length == 0)
                            return callback({
                                code: 'INVALID_REQUEST',
                                message: 'payroll_payment_active tidak ditemukan!'
                            });

                        callback(null, {
                            code: 'DELETE_SUCCESS',
                            id: '?',
                            message: '',
                            data: updated
                        });
                    })
                    .catch(err => {
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

exports.generatePayroll = (APP, req, callback) => {
    let { presence_monthly, presence_period, presence } = APP.models.company[
        `${process.env.MYSQL_NAME}_${req.body.company}`
    ].mysql;

    async.waterfall(
        [
            function getPresencePeriod(callback) {
                presence_period
                    .findAll({
                        limit: 2,
                        order: [['id', 'DESC']]
                    })
                    .then(res => {
                        if (res.length == 0)
                            return callback({ code: 'NOT_FOUND', message: 'Presence Period tidak ditemukan!' });

                        callback(null, res[1]);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({});
                    });
            },

            function getPresenceDetail(data, callback) {
                presence
                    .findAll({
                        where: {
                            date: { $between: [data.date_start, data.date_end] }
                        }
                    })
                    .then(res => {
                        if (res.length == 0)
                            return callback({ code: 'NOT_FOUND', message: 'Presence tidak ditemukan!' });

                        callback(null, res);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({});
                    });
            },

            function filterPresencePermission(data, callback) {
                Promise.all(
                    data.map((x, i) => {
                        console.log(x);
                        // 6 = izin
                        if (x.presence_setting_id == 6) {
                            console.log(x.presence_setting_id);
                            return x;
                        }
                    })
                ).then(arr => {
                    // console.log(arr);
                });
            }
        ],
        (err, result) => {
            if (err) return callback(err);

            callback(null, result);
        }
    );
};
