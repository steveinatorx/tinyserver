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
var dataLayer=require('./dataLayer');
var _=require('lodash');
//var promise=require('bluebird');
var dbConfig = require('./db.js');
var mongoose = require('mongoose');
mongoose.connect(dbConfig.url);
// Configuring Passport
var passport = require('passport');
var expressSession = require('express-session');
app.use(expressSession({secret: 'mySecretKeyDawg'}));
app.use(passport.initialize());
app.use(passport.session());

var initPassport = require('./init');
initPassport(passport);



app.use(cors());

//catchall
/*process.on('uncaughtException', function (err) {
    logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging with MetaData
    process.exit(1); // exit with failure
});*/

var server = app.listen(3000, '127.0.0.1', function () {
    var host = server.address().address;
      var port = server.address().port;
        logger.info('Example app listening at http://%s:%s', host, port);
        //dataLayer.setSFData();
        dataLayer.setSportScores();



});

var socketio = require('socket.io')(server, {
    path: '/socket.io',
    transports: ['websocket']
});

/*function onDisconnect (socket) {
}*/

// When the user connects.. perform this
function onConnect (socket) {
    socket.on('ping', function (data) {
          logger.info('recd ping [%s] %s', socket.address, JSON.stringify(data, null, 2));
              socket.emit('pong', 'This is coming from the Socket.io Server - ' + new Date());
    });

    socket.on('getTopics', function(data) {
       logger.info('recd getTopics [%s] %s', socket.address, JSON.stringify(data, null, 2));
       logger.info('url?',config.wundergroundGeoLookupPartialUrl+data.lat+','+data.lon+'.json');
       api.getRest(config.wundergroundGeoLookupPartialUrl+data.lat+','+data.lon+'.json').then(function(res){
            //logger.info('###getREst results?',res);
          dataHelpers.parseWundergroundGeolookup(data.lat,data.lon,res).then(function(nearestStation){
              logger.info('nearest?',nearestStation);
              var distance=nearestStation.distance;
                delete nearestStation.distance;
              dataLayer.getOrSetWUStationData(nearestStation,'cWeather').then(function(payload){
                  //logger.info('nearestStation?',nearestStation);
                  //logger.info('###cWeather return this to client:', payload);
                  _.merge(payload,distance);
                  socket.emit('currentWeather', payload);
                  dataLayer.buildSFPoi().then(function(poiData){
                      socket.emit('poi',poiData);
                  });
                  dataLayer.getOrSetWUStationData(nearestStation,'hWeather').then(function(payload){
                      //logger.info('###hWeather return this to client:', payload);
                      socket.emit('hourlyWeather', payload);
                  });


              });
          });
       });


        dataLayer.getSportsScores().then(function(data){
            logger.info('calling getSportsScores',data);
            broadcast('sportsTicker',data);
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
              logger.info('[%s] DISCONNECTED');
            });
            // Call onConnect.
            onConnect(socket);
              logger.info('[%s] CONNECTED');
});

function broadcast(topic, data){
   socketio.emit(topic, data);
}


//todo: put into a queue pattern/rate limiter
//GETTERS
setInterval(function() {
    dataLayer.setSportScores();

}, 50000);

setInterval(function(){
    dataLayer.getSportsScores().then(function(data){
       logger.info('#$#$#$#$did i pull scores?',data);
        broadcast('sportsTicker',data);
    });

},120000);
