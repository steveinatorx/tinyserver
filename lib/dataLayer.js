'use strict';

var redis=require('redis');
var logger=require('winston');
var api=require('./api');
var config=require('./config');
var rClient=redis.createClient();
var promise=require('bluebird');
promise.longStackTraces();

rClient.on("error", function (err) {
    logger.error(err);
});

var setWUStationData=function(station){
    return new promise(function(resolve, reject) {

        logger.info('in setWUStationData');
        logger.info(config.wundergroundPWSURLPartial + '/' + station.id + '.json');
        api.getRest(config.wundergroundPWSURLPartial + station.id + '.json').then(function(res) {


            logger.info('returned from getREst call....1',res);
            logger.info('returned from getREst call....1',res);


            var json = JSON.parse(res);

            logger.info('returned from getREst call....2');


            var o = json.current_observation;

            var obs = {};
            obs.weather = o.weather;
            obs.observation_time = o.observation_time;
            obs.temp = o.temp_f;
            obs.humidity = o.relative_humidity;
            obs.wind_string = o.wind_string;
            obs.wind_dir = o.wind_dir;
            obs.wind_gust_mph = o.wind_gust_mph;
            obs.visibility = o.visibility_mi;
            obs.icon_url = o.icon_url;

            var obsJson={};

            try {
                obsJson = JSON.stringify(obs);
            } catch (err){

                logger.error('fucked up stringify?',err);

            }


            logger.info('i stringified obs?',obsJson);



            rClient.hset('wupws:' + station.id, 'data', obsJson, function (err, reply) {
                logger.info('trying to set station data data hset', reply);
                if (err) {
                    logger.error('I GOT AN ERRRROR trying to hset station data data',err);
                    reject(err);
                }
                logger.info('here is what im trying to resolve',obsJson);
                resolve(obsJson);
            });


        });
    });
};

var getWUStationData=promise.method(function(station) {
    return new promise(function (resolve, reject) {


        logger.info('in getWSUStationData....',station);

        rClient.hget('wupws:' + station.id, 'data', function (err, reply) {
            if (err) {
                logger.info('ERRRRRRRR', err);
                reject(err);
            }
            if (reply) {
                logger.info('retrieved pws data from redis', reply);
                resolve(reply);
            }
            //no data
            resolve(null);
        });
    });
});

var getOrSetWUStationInfo=function(station){
    return new promise(function(resolve, reject) {
        logger.info('in getOrSetWUStationInfo', station);
        rClient.hget('wupws:' + station.id, 'meta', function (err, reply) {
            if (err || reply === null) {

                logger.info('no station meta found - set meta then set data');
                //todo: a list of ordered vals instead of json blob will save mem resources if this dataset gets big
                rClient.hset('wupws:' + station.id, 'meta', JSON.stringify(station.id), function (err, reply) {
                    logger.info('hset meta data - rClient reply?', reply);
                    if (reply) {
                        return setWUStationData(station).then(function(err,data) {
                            logger.info('returned from setWUStationData',data);
                            if(err){
                                reject(err);
                            }
                            resolve(data);
                        });
                    }
                    else if(err) {
                        logger.error('rClient hset META error!', err);
                        reject(err);
                    }
                });
            }
            else if(reply){
                logger.info('i found this station meta data - try to retrieve data data');

              return  getWUStationData(station).then(function(data){
                  logger.info('returned from getWSUtationData data??', data);
                   if(typeof data === 'undefined') {
                       logger.error('no station data found for associated meta - set it');
                       return setWUStationData(station).then(function(err,data) {
                           logger.info('returned from setWUStationData err',err);
                           logger.debug('returned from setWUStationData data',data);
                           logger.info(data);
                           if(err){
                               reject(err);
                           }
                           resolve(data);
                       });
                   }
                   //logger.info('returned from getWSUtationData err',err);
                   if(data) {
                       resolve(data);
                   }

                }).catch(function(e) {
                    logger.error('where my data at?',e);
                    reject(e);
                });
            }
        });
    });
};

module.exports = {
    getOrSetWUStationInfo:getOrSetWUStationInfo,
    setWUStationData:setWUStationData,
    getWUStationData:getWUStationData
};

