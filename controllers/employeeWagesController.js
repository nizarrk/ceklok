'use strict';

const async = require('async');
const path = require('path');
const bcrypt = require('bcrypt');

exports.get = (APP, req, callback) => {
    let { employee_wages, income_deduction } = APP.models.company[req.user.db].mysql;
    async.waterfall(
        [
            function getData(callback) {
                employee_wages
                    .findAll({
                        where: {
                            status: 1
                        }
                    })
                    .then(res => {
                        if (res.length == 0)
                            return callback({ code: 'NOT_FOUND', message: 'Employee Wages tidak ditemukan!' });

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

            function getIncomeDeduction(data, callback) {
                let ids = [];

                // ids.push(data.income_id.split(','));
                // ids.push(data.deduction_id.split(','));

                Promise.all(
                    data.map((x, i) => {
                        return income_deduction
                            .findAll({
                                where: {
                                    id: [x.deduction_id, x.income_id]
                                }
                            })
                            .then(res => {
                                data[i].data = res;
                                callback(null, data);
                            })
                            .catch(err => {
                                console.log(err);
                                callback({
                                    code: 'ERR_DATABASE',
                                    data: err
                                });
                            });
                    })
                )
                    .then(() => {
                        callback(null, {
                            code: 'OK',
                            data: data
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR',
                            data: err
                        });
                    });
            }

            // function calculateWages(data, callback) {
            //   let denomination, deduction, income, result;

            //   Promise.all(
            //     data.data.map(x => {
            //       console.log('masuk map');
            //       if (x.denomination == 1) {
            //         console.log('masuk rupiah');
            //         if (x.type == 1) income =+ x.nominal;
            //         if (x.type == 2) deduction =+ x.nominal;

            //         result = parseInt(total) + income - deduction;
            //       }
            //       if (x.denomination == 2) {
            //         console.log('masuk persen');
            //         if (x.type == 1) income =+ (x.nominal / 100) * total;
            //         if (x.type == 2) deduction =+ (x.nominal / 100) * total;

            //         console.log('income:', income);
            //         console.log('deduction:', deduction);
            //         console.log('total:', total);

            //         result = parseInt(total) + income - deduction;
            //       }
            //     })
            //   )
            //   .then(() => {
            //     console.log(result);
            //     data.total = result;
            //     callback(null, data);
            //   })
            //   .catch(err => {
            //     console.log(err);
            //     callback({
            //       code: 'ERR',
            //       data: err
            //     });
            //   })
            // },
        ],
        (err, result) => {
            if (err) return callback(err);

            callback(null, result);
        }
    );
};

exports.getById = (APP, req, callback) => {
    if (!req.body.id) {
        return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
        });
    }

    let { employee_wages } = APP.models.company[req.user.db].mysql;

    employee_wages
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

exports.insert = (APP, req, callback) => {
    let { employee_wages } = APP.models.company[req.user.db].mysql;
    let { user_id, income_id, deduction_id, wage } = req.body;

    async.waterfall(
        [
            function checkBody(callback) {
                if (!user_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter user_id!'
                    });

                if (!income_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter income_id!'
                    });

                if (!deduction_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter deduction_id!'
                    });

                if (!wage)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter wage!'
                    });

                callback(null, true);
            },

            function checkEmployee(data, callback) {
                employee_wages
                    .count({
                        where: {
                            user_id: user_id
                        }
                    })
                    .then(res => {
                        if (res > 0)
                            return callback({ code: 'INVALID_REQUEST', message: 'Employee wages already assigned!' });

                        callback(null, true);
                    })
                    .catch(err => {
                        console.log(err);
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },

            function generateCode(result, callback) {
                let kode = APP.generateCode(employee_wages, 'EW');
                Promise.resolve(kode)
                    .then(x => {
                        callback(null, {
                            code: x
                        });
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

            function uploadPath(data, callback) {
                try {
                    if (!req.files || Object.keys(req.files).length === 0) {
                        return callback({
                            code: 'INVALID_REQUEST',
                            message: 'Kesalahan pada parameter upload!'
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
                            let docPath = `./public/uploads/company_${req.user.code}/wages/`;

                            callback(null, {
                                kode: data.code,
                                doc: docPath + fileName + path.extname(req.files.upload.name)
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error uploadPath', err);
                    callback({
                        code: 'ERR',
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

            function createNew(data, callback) {
                employee_wages
                    .create({
                        code: data.kode,
                        user_id: user_id,
                        income_id: income_id,
                        deduction_id: deduction_id,
                        wage: wage,
                        upload: data.doc.slice(8),
                        created_by: req.user.id
                    })
                    .then(res => {
                        callback(null, {
                            code: 'INSERT_SUCCESS',
                            id: '',
                            message: 'Wages karyawan berhasil ditambahkan!',
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

exports.update = (APP, req, callback) => {
    let { employee_wages } = APP.models.company[req.user.db].mysql;
    let { id, income_id, deduction_id, status, wage, pass } = req.body;

    async.waterfall(
        [
            function checkBody(callback) {
                if (!id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter id!'
                    });

                if (!income_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter income_id!'
                    });

                if (!deduction_id)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter deduction_id!'
                    });

                if (!wage)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter wage!'
                    });

                if (!status)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter status!'
                    });

                if (!pass)
                    return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan pada parameter pass!'
                    });

                callback(null, true);
            },

            function verifyCredentials(data, callback) {
                APP.models.mysql.admin
                    .findOne({
                        where: {
                            id: req.user.id
                        }
                    })
                    .then(res => {
                        if (bcrypt.compareSync(pass, res.password)) {
                            callback(null, true);
                        } else {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'Invalid Password!'
                            });
                        }
                    })
                    .catch(err => {
                        console.log('Error function verifyCredentials', err);
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Error function verifyCredentials',
                            data: err
                        });
                    });
            },

            function uploadPath(data, callback) {
                try {
                    if (!req.files || Object.keys(req.files).length === 0) {
                        return callback({
                            code: 'INVALID_REQUEST',
                            message: 'Kesalahan pada parameter upload!'
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
                            let docPath = `./public/uploads/company_${req.user.code}/wages/`;

                            callback(null, {
                                kode: data.code,
                                doc: docPath + fileName + path.extname(req.files.upload.name)
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error uploadPath', err);
                    callback({
                        code: 'ERR',
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

            function updatePayrollPayment(data, callback) {
                employee_wages
                    .update(
                        {
                            income_id: income_id,
                            deduction_id: deduction_id,
                            wage: wage,
                            upload: data.doc.slice(8),
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
                            code: 'UPDATE_SUCCESS',
                            message: 'Income / Deduction berhasil diubah!',
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

exports.delete = function(APP, req, callback) {
    let { employee_wages } = APP.models.company[req.user.db].mysql;
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
                employee_wages
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
                                message: 'Income / Deduction tidak ditemukan!'
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
