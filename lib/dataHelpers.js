'use strict';

var logger=require('./log');
var _=require('lodash');
var geolib =require('geolib');
var promise=require('bluebird');
var rClient=require('redis').createClient();

var parseWundergroundGeolookup = promise.method(function(clientLat,clientLon,data) {
  return new promise(function(resolve, reject) {

      //logger.info('in parseWUN',data);

      var stationGeo = [];
      try {
          var json = JSON.parse(data);
          //stationGeo.push({'latitude': json.location.lat, 'longitude': json.location.lon});
          _.each(json.location.nearby_weather_stations, function (pws) {
              _.each(pws.station, function (station) {
                  if(typeof station.id !== 'undefined') {
                      if(typeof station.id !== 'undefined') {
                          stationGeo.push({'id': station.id, 'latitude': station.lat, 'longitude': station.lon});
                      }
                  }
              });
          });

          //logger.info(stationGeo);
          _.map(stationGeo, function (station) {
              station.distance = geolib.getDistance({
                  'latitude': clientLat,
                  'longitude': clientLon
              }, {'latitude': station.latitude, 'longitude': station.longitude});
              return station;
          });
          stationGeo = _.sortBy(stationGeo, 'distance');
          resolve(stationGeo[0]);
      } catch (err) {
          logger.error('in parseWundergroundGeolookup', err);
          reject(err);
      }
  });
 });

var filterWundergroundData =function(weather,dataType) {
    return new promise(function (resolve) {
        logger.info('filtering weather....',weather);
        var wObj=JSON.parse(weather);

        if(dataType==='cWeather') {
            resolve(wObj.current_observation);
        } else {
            resolve(wObj.hourly_forecast);
        }



    });

};

var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
var linkRe = new RegExp(expression);

/*
var whiteList=['Golden State','San Francisco','Oakland'];
var wlRe=new RegExp(whiteList.join("|"), "i");
*/
var blackList=['mlb_','nba_','true','false'];
var blRe=new RegExp(blackList.join("|"), "i");

var parseBLData = function(data){
    return new promise(function (resolve) {
        data = data.replace(/%[A-Za-z]./gi, '');
        //data = data.replace(/%B./gi, '');
        //data = data.replace(/%AB/g, '');

        //logger.info('PARSE BL',data);
        try {
            data = decodeURIComponent(data);
        } catch(e){

            logger.error(e);

        }
        var blowUp = data.split(/=|&/);

        var games = [];
        var game = '';

        _.each(_.reject(blowUp, function (obj) {
            return obj.match(blRe) || obj.match(/^\d+$/) || obj === "";
        }), function (data) {

            if (data.match(linkRe)) {

                game = game.trim();
                games.push(game);
                game = ' ';
            }
            else {
                data = data.replace(/\s+/, ' ');
                game += ' ' + data;


            }
        });
        resolve(games);
    });
};

//hgetall returns an ugly array so require hash
var getCacheData=function (key,hash){
    return new promise(function (resolve, reject) {
        rClient.hget(key, hash, function (err, reply) {
            if (err) {
                reject(err);
            }
            if (reply) {
                //logger.info('retrieved data from redis', reply);
                resolve(reply);
            }
            //no data
            reject(reply);
        });
    });
};

module.exports = {
  parseWundergroundGeolookup:parseWundergroundGeolookup,
  filterWundergroundData:filterWundergroundData,
  parseBLData:parseBLData,
  getCacheData:getCacheData
};
