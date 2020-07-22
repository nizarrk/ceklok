'use strict';

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

module.exports = (file, directory) => {
    try {
        const formData = new FormData();

        formData.append('directory', directory);
        formData.append('file', fs.createReadStream(file.tempFilePath));

        console.log('masuk tes cdn');

        axios({
            method: 'post',
            url: `${process.env.CDN_HOST}/cdn/upload`,
            headers: formData.getHeaders(),
            data: formData
        });

        return true;
    } catch (err) {
        console.log(err.message);
        return false;
    }
};
