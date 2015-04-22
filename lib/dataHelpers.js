'use strict';

var logger=require('./log');
var _=require('lodash');
var geolib =require('geolib');
var promise=require('bluebird');

var parseWundergroundGeolookup = promise.method(function(clientLat,clientLon,data) {
  return new promise(function(resolve, reject) {


      logger.info('in parseWUN',data);

      var stationGeo = [];
      try {
          var json = JSON.parse(data);
          stationGeo.push({'latitude': json.location.lat, 'longitude': json.location.lon});

          _.each(json.location.nearby_weather_stations, function (pws) {
              _.each(pws.station, function (station) {
                  stationGeo.push({'id': station.id, 'latitude': station.lat, 'longitude': station.lon});
              });
          });

          logger.info(stationGeo);
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

module.exports = {
  parseWundergroundGeolookup:parseWundergroundGeolookup
};
