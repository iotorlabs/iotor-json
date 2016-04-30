# iotor-json 

Read `iotor.json` files with semantics, normalisation, defaults and validation.

Install via [npm](https://www.npmjs.org/package/iotor-json): `npm install --save iotor-json`

## Usage

#### .read(file, options, callback)
#### .readSync(file, options)

Reads `file` and applies normalisation, defaults and validation according to the `iotor.json` spec.
If the passed `file` does not exist, the callback is called with `error.code` equal to `ENOENT`.
If the passed `file` contents are not valid JSON, the callback is called with `error.code` equal to `EMALFORMED`.
If the `json` does not comply with the `iotor.json` spec, the callback is called with `error.code` equal to `EINVALID`.

If `file` is a directory, `find()` will be used to search for the json file.
The `options` argument is optional and can be omitted. These options will be passed to `parse` method.


```js
var iotorJon = require('iotor-json');

// Can also be used by simply calling iotorJon()
iotorJon.read('/path/to/iotor.json', function (err, json) {
    if (err) {
        console.error('There was an error reading the file');
        console.error(err.message);
        return;
    }

    console.log('JSON: ', json);
});
```


#### .parse(json, options)

Parses an object. Useful when you want to apply normalisation and validation directly to an object.
If the `json` does not comply with the `iotor.json` spec, an error is thrown with `error.code` equal to `EINVALID`.

The `options` arguments is optional and can be omitted. Available options:

- validate: Apply validation, defaults to `true`
- normalize: Apply normalisation, defaults to `false`
- clone: clone, use and return the passed in `json` object instead of using it directly, defaults to `false`


```js
var iotorJon = require('iotor-json');

var json = {
    name: 'my-package',
    version: '0.0.1'
};

try {
    iotorJon.parse(json);
} catch (err) {
    console.error('There was an error parsing the object');
    console.error(err.message);
}
```

#### .getIssues(json) - DEPRECATED

Validates the passed `json` object.

Returns an object with errors and warnings of this iotor.json contents.

```js
var iotorJon = require('iotor-json');

var json = {
    name: 'myPackage',
    version: '0.0.1',
    main: {}
};

var issues = iotorJon.getIssues(json);

expect(issues).toEqual({
  errors: ['The "main" field has to be either an Array or a String'],
  warnings: ['The "name" must be lowercase']
});

#### .validate(json)

Validates the passed `json` object.

Throws an error with `error.code` equal to `EINVALID` if it does not comply with the spec.

```js
var iotorJon = require('iotor-json');

var json = {
    name: 'myPackage',
    version: '0.0.1'
};

try {
    iotorJon.validate(json);
} catch (err) {
    console.error('There was an error validating the object');
    console.error(err.message);
}
```

#### .normalize(json)

```js
var iotorJon = require('iotor-json');

var json = {
    name: 'my-package',
    version: '0.0.1',
    main: 'foo.js,bar.js'
};

iotorJon.normalize(json);
json.main // ['foo.js', 'bar.js']
```


#### .find(folder, callback)
#### .findSync(folder)

Finds the `json` filename inside a folder.
Checks if a `iotor.json` exists, falling back to `library.json` (deprecated) and `.iotor.json`.
If no file was found, the callback is called with a `error.code` of `ENOENT`.

```js
var iotorJon = require('iotor-json');

iotorJon.find('/path/to/folder', function (err, filename) {
    if (err) {
        console.error('There is no json file in the folder');
        return;
    }

    console.log('Filename: ', filename);

    // Now that we got the filename, we can read its contents
    iotorJon.read(filename, function (err, json) {
        if (err) {
            console.error('There was an error reading the file');
            console.error(err.message);
            return;
        }

        console.log('JSON: ', json);
    });
});
```


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
