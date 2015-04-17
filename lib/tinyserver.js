/*
 * tinyserver
 * https://github.com/stevenbrezina/tinyserver
 *
 * Copyright (c) 2015 steveinatorx
 * Licensed under the MIT license.
 */

'use strict';

var express = require('express');
var app = express();
var logger=require('./log.js');

app.get('/', function (req, res) {
    res.send('Hello World!');
});

//catchall
process.on('uncaughtException', function (err) {
    logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging with MetaData
    process.exit(1); // exit with failure
});

var server = app.listen(3000, function () {
//yoyoyoyoyoyoyoy

    var host = server.address().address;
      var port = server.address().port;

        logger.info('Example app listening at http://%s:%s', host, port);

});

