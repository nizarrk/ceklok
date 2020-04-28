'use strict';
const fileType = require('file-type');

const imageExts = new Set(['jpg', 'jpeg', 'png']);

const docExts = new Set(['doc', 'docx', 'xls', 'xlsx', 'csv', 'pdf']);

const checkFile = async (input, type) => {
  if (Array.isArray(input)) {
    input.map(async (x, i) => {
      if (type[i] == 'image') {
        const ret = await fileType.fromBuffer(input);
        return imageExts.has(ret && ret.ext) ? ret : null;
      } else {
        const ret = await fileType.fromBuffer(input);
        return docExts.has(ret && ret.ext) ? ret : null;
      }
    });
  } else {
    if (type == 'image') {
      const ret = await fileType.fromBuffer(input);
      return imageExts.has(ret && ret.ext) ? ret : null;
    } else {
      const ret = await fileType.fromBuffer(input);
      return docExts.has(ret && ret.ext) ? ret : null;
    }
  }
};

module.exports = checkFile;

Object.defineProperty(checkFile, 'minimumBytes', { value: fileType.minimumBytes });
