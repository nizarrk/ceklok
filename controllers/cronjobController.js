'use strict';
const async = require('async');
const presence = require('./presenceController');

exports.generateDailyAbsence = ( APP, rule, callback ) => {

    async.waterfall(
        [
            function checkCompany( callback ) {
                let data = {
                    company: [
                        'SELECT company_code FROM ceklok.company WHERE status = 1',
                        {
                            mapToModel: true,
                            model: APP.models.mysql.company
                        }
                    ],
                    data_db: [],
                    company_code: [],
                    company_setting: [],
                    results: []
                };

                APP.db.sequelize
                    .query( data.company[0], data.company[1] )
                    .then(res => {
                        if ( res.length == 0 ) return callback({
                            code: 'NOT_FOUND',
                            message: 'Tidak ada Company Aktif!'
                        });

                        data.data_company = res;

                        callback( null, data );
                    })
                    .catch(err => {
                        callback({
                            code: 'ERR_DATABASE',
                            data: err
                        });
                    });
            },
            function checkDBAvaibility( data, callback ) {
                Promise.all(
                    data.data_company.map( x => {
                        return APP.db.sequelize
                            .query(`SHOW DATABASES LIKE '${process.env.MYSQL_NAME}_${x.company_code}'`)
                            .then(res => {
                                if ( res[0].length != 0 ) data.data_db.push( res[0][0][`Database (${process.env.MYSQL_NAME}_${x.company_code})`] );

                                return;
                            });
                    })
                )
                .then(() => {
                    callback( null, data );
                })
                .catch(err => {
                    console.log( err );
                    callback({
                        code: 'ERR',
                        data: err
                    });
                });
            },
            function filterData( data, callback ) {
                Promise.all(
                    data.data_company.map( x => {
                        let filter = new Promise( function ( resolve, reject ) {
                            data.data_db.filter( y => {
                                let replaced = y.replace(`${process.env.MYSQL_NAME}_`, '');

                                if ( replaced == x.company_code ) {
                                    data.company_code.push( x.company_code );
                                }

                                resolve( true );
                            });
                        });

                        return filter
                            .then(res => {
                                return true;
                            })
                    })
                )
                .then(() => {
                    data.total_company = data.data_company.length;
                    
                    callback( null, data );
                })
                .catch(err => {
                    callback({
                        code: 'ERR',
                        data: err
                    });
                });

            },
            function getCompanySetting( data, callback ) {
                Promise.all(
                    data.company_code.map( ( x, i ) => {
                     
                        data.company_setting = [
                            `
                                SELECT 
                                    value 
                                FROM ${process.env.MYSQL_NAME}_${x}.presence_setting 
                                WHERE presence_setting_id = 2
                            `,
                            {
                                mapToModel: true,
                                model: APP.models.company[`${process.env.MYSQL_NAME}_${x}`].mysql.presence_setting
                            }
                        ];

                        return APP.db.sequelize
                            .query( data.company_setting[0], data.company_setting[1] )
                            .then(res => {
                                console.log(`Looping ke: ${i + 1}`);
                                console.log(`Company: ${x}`);

                                if ( res.length > 0 ) {
                                    let result = rule.hour.filter( x => x == res[0].value );

                                    data.results.push({
                                        company_code: x,
                                        filtered: result
                                    });
                                }
                               
                                return true;
                            })
                    })
                )
                .then(arr => {
                    if ( data.results.length == 0 ) return callback({
                        code: 'NOT_FOUND',
                        message: 'Tidak ada data setting company'
                    });

                    callback( null, data );
                })
                .catch(err => {
                    callback({
                        code: 'ERR',
                        data: err
                    });
                });            
            },
            function generateDaily( data, callback ) {
                Promise.all(
                    data.results.map( x => {
                        if ( x.filtered.length > 0 && new Date().getHours() == x.filtered[0] ) {
                            let generate = new Promise( function( resolve, reject ) {
                                let data_request = {
                                    body: {
                                        company: x.company_code
                                    }
                                };

                                presence.generateDailyPresence( APP, data_request, ( err, result ) => {
                                    if ( err ) return reject( err );

                                    resolve( true );
                                });
                            });

                            return generate
                              .then(res => {
                                  return true;
                              })
                        }
                    })  
                )
                .then(() => {
                    callback( null, data );
                })
                .catch(err => {
                    callback({
                        code: 'ERR',
                        data: err
                    });
                });
            }
        ],
        function ( err, result ) {
            if ( err ) return console.log('CRON Error Executed!');

            console.log('CRON Success Executed!')
        }
    );
};
