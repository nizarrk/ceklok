'use strict';

const async = require('async');

const branchController = require('../controllers/branchLocationController');
const gradeController = require('../controllers/gradeController');
const jobtitleController = require('../controllers/jobTitleController');

exports.listWages = ( APP, req, callback ) => {
    let { id, db } = req.user;
    let { wages, grade, job_title, branch }  = APP.models.company[db].mysql;
    let { grade_id, job_title_id, branch_id, wages_id } = req.body;

    wages.belongsTo( grade, {
        foreignKey: 'grade_id',
        targetKey: 'id'
    });

    wages.belongsTo( job_title, {
        foreignKey: 'job_title_id',
        targetKey: 'id'
    });

    wages.belongsTo( branch, {
        foreignKey: 'branch_id',
        targetKey: 'id'
    });
    
    async.waterfall(
        [
            function validationRequest( callback ) {
                let data = {
                    param_where: {}
                }

                if ( grade_id && grade_id != null ) data.param_where.grade_id = grade_id;

                if ( job_title_id && job_title_id != null ) data.param_where.job_title_id = job_title_id;

                if ( branch_id && branch_id != null ) data.param_where.branch_id = branch_id;

                if ( wages_id && wages_id != null ) data.param_where.id = wages_id;

                callback( null, data );
            },
            function requestData( data, callback ) {
                wages
                    .findAll({
                        attributes: ['id','created_at','updated_at','created_by','updated_by'],
                        include: [
                            {
                                model: grade,
                                attributes: ['id','code','name','description'],
                                required: true
                            },
                            {
                                model: job_title,
                                attributes: ['id','code','name','description'],
                                required: true
                            },
                            {
                                model: branch,
                                attributes: ['id','code','name','description','address'],
                                required: true
                            }
                        ],
                        where: data.param_where,
                        order: [
                            ['created_at','DESC']
                        ]
                    })
                    .then(res => {
                        if ( res.length == 0 ) return callback({
                            code: 'NOT_FOUND',
                            message: 'Data tidak ditemukan'
                        });

                        callback( null, {
                            code: 'OK',
                            message: 'Data ditemukan',
                            data: res
                        });
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami',
                            data: err
                        });
                    });
            }
        ],
        function ( err, result ) {
            if ( err ) return callback( err );

            return callback( null, result );
        }
    );
};

exports.addWages = ( APP, req, callback ) => {
    let { id, db } = req.user;
    let { wages }  = APP.models.company[db].mysql;
    let { grade_id, job_title_id, branch_id, minimum_nominal, maximum_nominal } = req.body;

    async.waterfall(
        [
            function validationRequest( callback ) {
                if ( !grade_id || !job_title_id || !branch_id || !minimum_nominal || !maximum_nominal ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( All )'
                });

                minimum_nominal  = parseInt( minimum_nominal );
                maximum_nominal = parseInt ( maximum_nominal );
                
                if ( minimum_nominal < 1 ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( minimum_nominal )'
                });

                if ( minimum_nominal < 1 ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( maximum_nominal )'
                });

                req.body.created_by = id;

                callback( null, {} );
                
            },
            function validationGradeId( data, callback ) {
                req.body.id = grade_id;

                gradeController.getById( APP, req, ( err, result ) => {
                    if ( err ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( grade_id )'
                    });

                    callback( null, data );
                });
            },
            function validationJobId( data, callback ) {
                req.body.id = job_title_id;

                jobtitleController.getById( APP, req, ( err, result ) => {
                    if ( err ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( job_title_id )'
                    });

                    callback( null, data );
                });
            },
            function validationBranchId( data, callback ) {
                req.body.id = branch_id;

                branchController.getById( APP, req, ( err, result ) => {
                    if ( err ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( branch_id )'
                    });

                    callback( null, data );
                });
            },
            function validationWagesId( data, callback ) {
                exports.listWages( APP, req, ( err, result ) => {
                    if ( result ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'the location has been in the setting'
                    });

                    callback( null, data );
                });
            },
            function insert( data, callback ) {
                delete req.body.id;

                wages
                    .create( req.body )
                    .then(res => {
                        callback( null, {
                            code: 'OK',
                            message: 'Success insert',
                            data: res
                        });
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( insert )',
                            data: err
                        });
                    });
            }
        ],
        function ( err, result ) {
            if ( err ) return callback( err );

            return callback( null, result );
        }
    );
};

exports.editWages = ( APP, req, callback ) => {
    let { id, db } = req.user;
    let { wages }  = APP.models.company[db].mysql;
    let { wages_id, minimum_nominal, maximum_nominal } = req.body;

    async.waterfall(
        [
            function validationRequest( callback ) {
                if ( !wages_id ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( All )'
                });

                let data = {
                    param_update: [
                        {
                            updated_by: id,
                            updated_at: new Date()
                        },
                        {
                            where: {
                                id: wages_id
                            }
                        }
                    ]
                };

                minimum_nominal  = parseInt( minimum_nominal );
                maximum_nominal = parseInt ( maximum_nominal );

                if ( minimum_nominal && minimum_nominal > 0 ) data.param_update[0].minimum_nominal = minimum_nominal;

                if ( maximum_nominal && maximum_nominal > 0 ) data.param_update[0].maximum_nominal = maximum_nominal;
          
                callback( null, data );
                
            },
            function validationWagesId( data, callback ) {
                exports.listWages( APP, req, ( err, result ) => {
                    if ( err ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( wages_id )'
                    });

                    callback( null, data );
                });
            },
            function update( data, callback ) {
                
                wages
                    .update( data.param_update[0], data.param_update[1] )
                    .then(res => {
                        callback( null, {
                            code: 'OK',
                            message: 'Success update',
                            data: req.body
                        });
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( update )',
                            data: err
                        });
                    });
            }
        ],
        function ( err, result ) {
            if ( err ) return callback( err );

            return callback( null, result );
        }
    );
};

exports.calulatorWages = ( APP, req, callback ) => {
    let { id, db } = req.user;
    let { wages, income_deduction }  = APP.models.company[db].mysql;
    let { grade_id, job_title_id, branch_id, income, deduction } = req.body;

    async.waterfall(
        [
            function validationRequest( callback ) {
                if ( !grade_id || !job_title_id || !branch_id ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( All )'
                });

                if ( !income || !Array.isArray( income ) || income.length == 0 ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( income )'
                });

                if ( !deduction || !Array.isArray( deduction ) || deduction.length == 0 ) return callback({
                    code: 'INVALID_REQUEST',
                    message: 'Kesalahan parameter ( deduction )'
                });

                callback( null, {} );
            },
            function requestWages( data, callback ) {
                wages
                    .findAll({
                        attributes: ['minimum_nominal','maximum_nominal'],
                        where: {
                            grade_id: grade_id,
                            job_title_id: job_title_id,
                            branch_id: branch_id
                        }
                    })
                    .then(res => {
                        if ( res.length == 0 ) return callback({
                            code: 'NOT_FOUND',
                            message: 'Data tidak ditemukan'
                        });

                        data.minimum_nominal = parseInt( res[0].minimum_nominal );
                        data.maximum_nominal = parseInt( res[0].maximum_nominal );
                        data.middle_value = ( data.minimum_nominal + data.maximum_nominal ) / 2;
                        data.income = 0;
                        data.deduction = 0;
                        data.data_income = [];
                        data.data_deduction = [];

                        callback( null, data );
                    })  
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( update )',
                            data: err
                        });
                    });
            },
            function calculateIncome( data, callback ) {
                let count = [];

                Promise.all(
                    income.map( x => {
                        return income_deduction
                            .findAll({
                                attributes: ['id','name','description','denomination','nominal'],
                                where: {
                                    id: x,
                                    type: 1
                                }
                            })
                            .then(res => {
                                if ( res.length == 0 ) count.push( x );

                                if ( res.length > 0 ) {
                                    data.income += res[0].denomination == 1 ? parseInt( res[0].nominal ) : ( res[0].nominal * data.middle_value ) / 100;
                                    data.data_income.push( res );
                                }

                                return true;

                            });
                    })
                )
                .then(res => {
                    if ( count.length > 0 ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( income value )',
                        data: count
                    });

                    callback( null, data );
                })
                .catch(err => {
                    callback({
                        code: 'ERR_DATABASE',
                        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( promise income )',
                        data: err
                    });
                });
            },
            function calculateDeduction ( data, callback ) {
                let count = [];

                Promise.all(
                    deduction.map( x => {
                        return income_deduction
                            .findAll({
                                attributes: ['id','name','description','denomination','nominal'],
                                where: {
                                    id: x,
                                    type: 2
                                }
                            })
                            .then(res => {
                                if ( res.length == 0 ) count.push( x );

                                if ( res.length > 0 ) {
                                    data.deduction += res[0].denomination == 1 ? parseInt( res[0].nominal ) : ( res[0].nominal * data.middle_value ) / 100;
                                    data.data_deduction.push( res );
                                }

                                return true;

                            });
                    })
                )
                .then(res => {
                    if ( count.length > 0 ) return callback({
                        code: 'INVALID_REQUEST',
                        message: 'Kesalahan parameter ( deduction value )',
                        data: count
                    });

                    data.result = {
                        nominal_thp: data.middle_value + data.income - data.deduction,
                        nominal_gapok: data.middle_value,
                        detil_income: data.data_income,
                        detail_deduction: data.data_deduction
                    };

                    callback( null, {
                        code: 'OK',
                        message: 'Data ditemukan',
                        data: data.result
                    });
                })
                .catch(err => {
                    console.log( err );
                    callback({
                        code: 'ERR_DATABASE',
                        message: 'Database bermasalah, mohon coba kembali atau hubungi tim operasional kami ( promise deduction )',
                        data: err
                    });
                });
            },
        ],
        function ( err, result ) {
            if ( err ) return callback( err );

            return callback( null, result );
        }
    );
};