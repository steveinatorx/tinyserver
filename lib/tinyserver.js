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
var logger=require('./log');
var cors=require('cors');
var api=require('./api');
var config=require('./config');
var socketio=require('socket.io');
var dataHelpers=require('./dataHelpers');

app.use(cors());

/*app.get('/', function (req, res) {
    res.send('Hello World!');
});
*/

//catchall
process.on('uncaughtException', function (err) {
    logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging with MetaData
    process.exit(1); // exit with failure
});


var server = app.listen(3000, '127.0.0.1', function () {

    var host = server.address().address;
      var port = server.address().port;

        logger.info('Example app listening at http://%s:%s', host, port);

});
var socketio = require('socket.io')(server, {
    path: '/socket.io'
});


/*function onDisconnect (socket) {
}*/

// When the user connects.. perform this
function onConnect (socket) {
//console.log(socket);

    // When the client emits 'ping', this listens and executes
    socket.on('ping', function (data) {
          console.info('recd ping [%s] %s', socket.address, JSON.stringify(data, null, 2));
              socket.emit('pong', 'This is coming from the Socket.io Server - ' + new Date());
    });

    socket.on('getTopics', function(data) {
        logger.info('recd getTopics [%s] %s', socket.address, JSON.stringify(data, null, 2));

       logger.info('url?',config.wundergroundGeoLookupURLPartial+data.lat+','+data.lon+'.json');
       api.getRest(config.wundergroundGeoLookupURLPartial+data.lat+','+data.lon+'.json').then(function(res){
          dataHelpers.parseWundergroundGeolookup(data.lat,data.lon,res);
       });

    });

    setInterval(function(){
          socket.emit('pulse',new Date());      
    },30000);
}

socketio.on('connection', function (socket) {
      socket.address = socket.handshake.address !== null ?
         socket.handshake.address.address + ':' + socket.handshake.address.port :
                 process.env.DOMAIN;

          socket.connectedAt = new Date();

              // Call onDisconnect.
              socket.on('disconnect', function () {
                      //onDisconnect(socket);
                            console.info('[%s] DISCONNECTED', socket.address);
                                });
                  // Call onConnect.
                  onConnect(socket);
                      console.info('[%s] CONNECTED', socket.address);

});



