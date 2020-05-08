'use strict';
// The following file types will not be accepted:

//     .doc - Too old and difficult to parse.
//     .xls - Too old and difficult to parse.
//     .ppt - Too old and difficult to parse.
//     .csv - Reason.
//     .svg - Detecting it requires a full-blown parser. Check out is-svg for something that mostly works.

const fileType = require('file-type');
const imageExts = new Set(['jpg', 'jpeg', 'png']);
const docExts = new Set(['docx', 'xlsx', 'pptx', 'pdf']);
const allExts = new Set(['jpg', 'jpeg', 'png', 'docx', 'xlsx', 'pptx', 'pdf']);

const checkFile = async (input, type) => {
  if (type == 'image') {
    const ret = await fileType.fromBuffer(input);
    return imageExts.has(ret && ret.ext) ? ret : null;
  } else if (type == 'doc') {
    const ret = await fileType.fromBuffer(input);
    return docExts.has(ret && ret.ext) ? ret : null;
  } else {
    const ret = await fileType.fromBuffer(input);
    return allExts.has(ret && ret.ext) ? ret : null;
  }
};

module.exports = checkFile;

// Object.defineProperty(checkFile, 'minimumBytes', { value: fileType.minimumBytes });
