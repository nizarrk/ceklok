'use strict';

const async = require('async');
const path = require('path');

exports.get = (APP, req, callback) => {
    let { payroll_payment } = APP.models.mysql;

    payroll_payment
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

exports.getById = (APP, req, callback) => {
    if (!req.body.id) {
        return callback({
            code: 'INVALID_REQUEST',
            message: 'Kesalahan pada parameter id!'
        });
    }

    let { payroll_payment } = APP.models.mysql;

    payroll_payment
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
    let { payroll_payment } = APP.models.mysql;
    let { name, desc } = req.body;

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

                callback(null, true);
            },

            function generateCode(result, callback) {
                let kode = APP.generateCode(payroll_payment, 'PP');
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
                            message: 'Kesalahan pada parameter icon!'
                        });
                    }

                    APP.fileCheck(req.files.icon.data, 'all').then(res => {
                        if (res == null) {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'File yang diunggah tidak sesuai!'
                            });
                        } else {
                            let fileName = new Date().toISOString().replace(/:|\./g, '');
                            let docPath = './public/uploads/payroll/payment/';

                            callback(null, {
                                kode: data.code,
                                doc: docPath + fileName + path.extname(req.files.icon.name)
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error uploadPath', err);
                    callback({
                        code: 'ERR',
                        id: 'APP01',
                        message: 'Terjadi Kesalahan, mohon coba kembali',
                        data: err
                    });
                }
            },

            function createNew(data, callback) {
                payroll_payment
                    .create({
                        code: data.kode,
                        icon: data.doc.slice(8),
                        name: name,
                        description: desc,
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

exports.update = (APP, req, callback) => {
    let { payroll_payment } = APP.models.mysql;
    let { id, name, desc, status } = req.body;

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

                callback(null, true);
            },

            function checkCurrentData(data, callback) {
                payroll_payment
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

            function checkUpload(data, callback) {
                try {
                    if (!req.files || Object.keys(req.files).length === 0) {
                        return callback(null, data);
                    }

                    APP.fileCheck(req.files.icon.data, 'all').then(res => {
                        if (res == null) {
                            callback({
                                code: 'INVALID_REQUEST',
                                message: 'File yang diunggah tidak sesuai!'
                            });
                        } else {
                            let fileName = new Date().toISOString().replace(/:|\./g, '');
                            let docPath = './public/uploads/payroll/payment/';

                            callback(null, {
                                doc: docPath + fileName + path.extname(req.files.icon.name)
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error uploadPath', err);
                    callback({
                        code: 'ERR',
                        id: 'APP01',
                        message: 'Terjadi Kesalahan, mohon coba kembali',
                        data: err
                    });
                }
            },

            function updatePayrollPayment(data, callback) {
                payroll_payment
                    .update(
                        {
                            icon: data.doc ? data.doc.slice(8) : data.icon,
                            name: name,
                            description: desc,
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

exports.delete = function(APP, req, callback) {
    let { payroll_payment } = APP.models.mysql;
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
                payroll_payment
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
                                message: 'payroll_payment tidak ditemukan!'
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
