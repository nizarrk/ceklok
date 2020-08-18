'use strict';

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

                if ( grade_id && grade_id != null ) data.where.grade_id = grade_id;

                if ( job_title_id && job_title_id != null ) data.where.job_title_id = job_title_id;

                if ( branch_id && branch_id != null ) data.where.branch_id = branch_id;

                if ( wages_id && wages_id != null ) data.where.id = wages_id;

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
                                model: grade,
                                attributes: ['id','code','name','description'],
                                required: true
                            },
                            {
                                model: grade,
                                attributes: ['id','code','name','description','address'],
                                required: true
                            }
                        ],
                        where: data.param_where,
                        order: [
                            ['created_at','DSC']
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
                    .cath(err => {
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

            return callback( null, resul );
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
                delete req.bod.id;

                wages
                    .create( req.body )
                    .then(res => {
                        callback( null, {
                            code: 'OK',
                            message: 'Success insert',
                            data: res
                        });
                    })
                    .cath(err => {
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

                if ( minimum_nominal && minimum_nominal > 0 ) data.param_update.minimum_nominal = minimum_nominal;

                if ( maximum_nominal && maximum_nominal > 0 ) data.param_update.maximum_nominal = maximum_nominal;
            
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
                    .cath(err => {
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
    let { wages }  = APP.models.company[db].mysql;
    let { grade_id, job_title_id, branch_id } = req.body;

    async.waterfall(
        [
            function validationRequest( callback ) {
                
            },
            function requestWages( data, callback ) {
                
            },
            function calculateIncome( data, callback ) {
                
            },
            function calculateDeduction ( data, callback ) {
                
            },
        ],
        function ( err, result ) {
            if ( err ) return callback( err );

            return callback( null, resul );
        }
    );
};