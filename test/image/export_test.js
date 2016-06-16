var fs = require('fs');
var path = require('path');

var constants = require('../../tasks/util/constants');
var getRequestOpts = require('./assets/get_image_request_options');

// packages inside the image server docker
var request = require('request');
var test = require('tape');


var userFileName = process.argv[2];

/**
 * Image formats to test
 *
 * N.B. 'png' is tested in `compare_pixels_test.js`
 *
 * TODO figure why 'jpeg' and 'webp' lead to errors
 *
 */
var FORMATS = ['svg', 'pdf', 'eps'];

/**
 * The tests below determine whether the images are properly
 * exported by (only) checking the file size of the generated images.
 *
 * MIN_SIZE is the minimum satisfactory file size.
 */
var MIN_SIZE = 100;


// make artifact folder
if(!fs.existsSync(constants.pathToTestImages)) {
    fs.mkdirSync(constants.pathToTestImages);
}

if(!userFileName) runAll();
else {

    if(path.extname(userFileName) !== '.json') {
        throw new Error('user-specified mock must end with \'.json\'');
    }

    runSingle(userFileName);
}

function runAll() {
    test('testing export formats', function(t) {

        // non-exhaustive list of mocks to test
        var fileNames = [
            '0.json',
            'geo_first.json',
            'gl3d_z-range.json',
            'text_export.json'
        ];

        t.plan(fileNames.length * FORMATS.length);

        fileNames.forEach(function(fileName) {
            testExports(fileName, t);
        });
    });
}

function runSingle(userFileName) {
    test('testing export for: ' + userFileName, function(t) {
        t.plan(FORMATS.length);

        testExports(userFileName, t);
    });
}

function testExports(fileName, t) {
    FORMATS.forEach(function(format) {
        testExport(fileName, format, t);
    });
}

function testExport(fileName, format, t) {
    var figure = require(path.join(constants.pathToTestImageMocks, fileName));
    var opts = getRequestOpts({
        figure: figure,
        format: format,
        scale: 1
    });

    var imageFileName = fileName.split('.')[0] + '.' + format,
        savedImagePath = path.join(constants.pathToTestImages, imageFileName),
        savedImageStream = fs.createWriteStream(savedImagePath);

    function checkExport(err) {
        if(err) throw err;

        fs.stat(savedImagePath, function(err, stats) {
            var didExport = stats.size > MIN_SIZE;

            t.ok(didExport, imageFileName + ' should be properly exported');
        });
    }

    request(opts)
        .pipe(savedImageStream)
        .on('close', checkExport);
}
