var fs = require('graceful-fs');
var path = require('path');
var deepExtend = require('deep-extend');
var nprops = require('nprops');
var isAsset = require('./util/isAsset');
var createError = require('./util/createError');

var POSSIBLES = ['library.json', '.library.json', 'library.properties'];

function read(file, options, callback) {

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // Check if file is a directory
  fs.stat(file, function (err, stat) {
    if (err) {
      return callback(err);
    }

    // It's a directory, so we find the json inside it
    if (stat.isDirectory()) {
      return find(file, POSSIBLES, function (err, file) {
        if (err) {
          return callback(err);
        }

        read(file, options, callback);
      });
    }

    // Otherwise read it
    fs.readFile(file, function (err, contents) {
      var json;

      if (err) {
        return callback(err);
      }

      try {
        if (path.extname(file) === '.properties') {
          json = nprops.parse(contents.toString());
        } else {
          json = JSON.parse(contents.toString());
        }
      } catch (err) {
        err.file = path.resolve(file);
        err.code = 'EMALFORMED';
        return callback(err);
      }

      // Parse it
      try {
        json = parse(json, options);
      } catch (err) {
        err.file = path.resolve(file);
        return callback(err);
      }

      callback(null, json, file);
    });
  });
}

function readSync(file, options) {
  var stat;
  var filename;
  var contents;
  var json;


  if (!options) {
    options = {};
  }
  try {
    stat = fs.statSync(file);
  } catch (err) {
    return err;
  }
  if (stat.isDirectory()) {
    filename = findSync(file, POSSIBLES);
    if (typeof filename !== 'string') {
      return filename;
    }
    return readSync(filename);
  }

  contents = fs.readFileSync(file);

  try {
    if (path.extname(file) === '.properties') {
      json = nprops.parse(contents.toString());
    } else {
      json = JSON.parse(contents.toString());
    }
  } catch (err) {
    err.file = path.resolve(file);
    err.code = 'EMALFORMED';
    return err;
  }

  try {
    json = parse(json, options);
  } catch (err) {
    err.file = path.resolve(file);
    return err;
  }

  return json;
}

function parse(json, options) {
  options = deepExtend({
    normalize: true,
    validate: true,
    clone: false
  }, options || {});

  // Clone
  if (options.clone) {
    json = deepExtend({}, json);
  }

  // Validate
  if (options.validate) {
    validate(json);
  }

  // Normalize
  if (options.normalize) {
    normalize(json);
  }

  return json;
}

// This function implements:
//
// https://github.com/iotor/iotor.json-spec
function getIssues(json) {
  // For things that shouldn't happen
  var errors = [];

  // For things that happen but they shoudn't
  var warnings = [];

  if (!json.name) {
    errors.push('No "name" property set');
  } else {
    if (!/^[a-zA-Z0-9_@][a-zA-Z0-9_@\.\- \/]*$/.test(json.name)) {
      errors.push('Name must be character, can contain digits, dots, dashes, "@" or spaces');
    }

    if (json.name.length > 50) {
      warnings.push('The "name" is too long, the limit is 50 characters');
    }

    if (!/^[a-zA-Z0-9_][a-zA-Z0-9_\.\-]*$/.test(json.name)) {
      warnings.push('The "name" is recommended to be character, can contain digits, dots, dashes');
    }

    if (/^[\.-]/.test(json.name)) {
      warnings.push('The "name" cannot start with dot or dash');
    }

    if (/[\.-]$/.test(json.name)) {
      warnings.push('The "name" cannot end with dot or dash');
    }
  }

  if (json.description && json.description.length > 140) {
    warnings.push('The "description" is too long, the limit is 140 characters');
  }

  if (json.main !== undefined) {
    var main = json.main;
    if (typeof main === 'string') {
      main = [main];
    }
    if (!(main instanceof Array)) {
      errors.push('The "main" field has to be either an Array or a String');
    } else {
      var ext2files = {};
      main.forEach(function (filename) {
        if (typeof filename !== 'string') {
          errors.push('The "main" Array has to contain only Strings');
        }
        if (/[*]/.test(filename)) {
          warnings.push('The "main" field cannot contain globs (example: "*.js")');
        }
        if (/[.]min[.][^/]+$/.test(filename)) {
          warnings.push('The "main" field cannot contain minified files');
        }
        if (isAsset(filename)) {
          warnings.push('The "main" field cannot contain font, image, audio, or video files');
        }
        var ext = path.extname(filename);
        if (ext.length >= 2) {
          var files = ext2files[ext];
          if (!files) {
            files = ext2files[ext] = [];
          }
          files.push(filename);
        }
      });
      Object.keys(ext2files).forEach(function (ext) {
        var files = ext2files[ext];
        if (files.length > 1) {
          warnings.push('The "main" field has to contain only 1 file per filetype; found multiple ' + ext + ' files: ' + JSON.stringify(files));
        }
      });
    }
  }

  return {
    errors: errors,
    warnings: warnings
  };
}

// For backward compatibility, it throws first error
function validate(json) {
  var issues = getIssues(json);

  if (issues.errors && issues.errors.length > 0) {
    throw createError(issues.errors[0], 'EINVALID');
  }
}

function normalize(json) {
  if (typeof json.main === 'string') {
    json.main = [json.main];
  }

  if (json.name) {
    json.name = json.name.replace(/[ ]+/g, '_');
  }

  return json;
}

function find(folder, files, index, callback) {
  var err;
  var file;

  if (typeof index === 'function') {
    callback = index;
    index = 0;
  }

  if (typeof files === 'function') {
    callback = files;
    files = POSSIBLES;
  }

  index = index || 0;

  if (files.length <= index) {
    err = createError('None of ' + files.join(', ') + ' were found in ' + folder, 'ENOENT');
    return callback(err);
  }

  file = path.resolve(path.join(folder, files[index]));
  fs.exists(file, function (exists) {
    if (!exists) {
      return find(folder, files, ++index, callback);
    }

    return callback(null, file);
  });
}

function findSync(folder, files, index) {
  var file;
  var exists;
  index = index || 0;

  if (files === undefined) {
    files = POSSIBLES;
  }

  if (files.length <= index) {
    return createError('None of ' + files.join(', ') + ' were found in ' + folder, 'ENOENT');
  }

  file = path.resolve(path.join(folder, files[index]));
  try {
    exists = fs.statSync(file);
  }
  catch (err) {
    exists = false;
  }
  if (exists && exists.isFile()) {
    return file;
  } else {
    return findSync(folder, files, ++index);
  }
}

module.exports = read;
module.exports.POSSIBLES = POSSIBLES;
module.exports.read = read;
module.exports.readSync = readSync;
module.exports.parse = parse;
module.exports.getIssues = getIssues;
module.exports.validate = validate;
module.exports.normalize = normalize;
module.exports.find = find;
module.exports.findSync = findSync;
