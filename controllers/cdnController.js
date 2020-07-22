'use strict';

exports.uploadCDN = (APP, req, callback) => {
    console.log('masuk controller cdn');
    req.files.file.mv(req.body.directory, function(err) {
        if (err)
            return callback({
                code: 'ERR',
                id: '',
                message: 'Terjadi Kesalahan, mohon coba kembali',
                data: err
            });

        callback(null, {
            code: 'OK',
            id: '',
            message: 'Success file upload',
            data: {
                directory: req.body.directory
            }
        });
    });
};
