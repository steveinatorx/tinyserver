'use strict';

var logger=require('winston');
var api=require('./api');
var config=require('./config');
var rClient=require('redis').createClient();
var _=require('lodash');
var dataHelpers=require('./dataHelpers');
var promise=require('bluebird');

promise.longStackTraces();

rClient.on("error", function (err) {
    logger.error('redisClient ERROR:',err);
});

var setWUStationData=function(station,dataType) {
    return new promise(function (resolve, reject) {

        logger.info('in setWUStationData' + station + ' dT?' + dataType);

        var url = null;

        switch (dataType) {
            case "cWeather":
                url = config.wundergroundPWSPartialUrl + station.id + '.json';
                break;
            case "hWeather":
                url = config.wundergroundHourlyUrl;
                break;
        }
        logger.info('calling rest url:', url);

        api.getRest(url)
            .then(function (res) {
                dataHelpers.filterWundergroundData(res,dataType)
                    .then(function (weather) {
                        //logger.info('returned from filter',weather);
                        var obs = {};
                        _.merge(obs, weather);
                        //logger.info('obs?', obs);

                            var obsJson = JSON.stringify(obs);
                            rClient.hset('wupws:' + station.id, dataType, obsJson, function (err) {
                                if (err) {
                                    reject(err);
                                }
                                //console.log('hset reply?', reply);
                                resolve(obsJson);
                            });

                    });
            });

    });
};

var getWUStationData=promise.method(function(station,dataType) {
    return new promise(function (resolve, reject) {

        rClient.hget('wupws:' + station.id, dataType, function (err, reply) {
            if (err) {
                reject(err);
            }
            if (reply) {
                //logger.info('retrieved pws data from redis', reply);
                resolve(reply);
            }
            //no data
            resolve(null);
        });
    });
});

var getOrSetWUStationData=function(station,dataType){
    return new promise(function(resolve, reject) {

        logger.info('in getOrSetWUStationData', station);
        logger.info('in getOrSetWUStationData dataType==', dataType);

        rClient.hget('wupws:' + station.id, 'meta', function (err, reply) {
            if (err || reply === null) {
                logger.info('no station meta found - set meta then set data');
                //todo: a list of ordered vals instead of json blob will save mem resources if this dataset gets big
                rClient.hset('wupws:' + station.id, 'meta', JSON.stringify(station), function (err, reply) {
                    if (reply) {
                        return setWUStationData(station,dataType).then(function(data) {
                            //logger.info('returned from setWUStationData err?',err);

                            if(err){
                                reject(err);
                            }
                            resolve(data);
                        });
                    }
                    else if(err) {
                        reject(err);
                    }
                });
            }
            else if(reply){

              return  getWUStationData(station, dataType).then(function(data){
                  //logger.info('returned from getWSUtationData data??', data===null);
                   if(data === null) {

                       logger.error('no station data found for associated meta - set it' , dataType);
                       return setWUStationData(station,dataType).then(function(err,data) {
                           //logger.debug('returned from setWUStationData data',data);
                           //logger.info(data);
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
                    //logger.error('where my data at?',e);
                    reject(e);
                });
            }
        });
    });
};

//prebake this for SF
//todo:prebake for other metro areas points of interest
var setSFData=function(){

    var points=[{lat:37.7932,lon:-122.4840,name:'Baker Beach'},{lat:37.7786,lon:-122.4840,name:'AT&T Park'},
                {lat:37.7594,lon:-122.3892,name:'Ocean Beach'},{lat:37.7955,lon:-122.3937,name:'Ferry Building'},
                {lat:37.8552045,lon:-122.3388593,name:'Berkeley Pier'}];

   _.map(points, function(data) {
       api.getRest(config.wundergroundGeoLookupPartialUrl + data.lat + ',' + data.lon + '.json').then(function (res) {

           return dataHelpers.parseWundergroundGeolookup(data.lat, data.lon, res).then(function (nearestStation) {
                   return getOrSetWUStationData(nearestStation,'cWeather');
           });
       });
   });
};



//todo: abstract the hset into a helper promise func
/*function setHashPromise(resolve, reject, key, hash, value){


}*/

function poiMapPromise(resolve, reject, key){
    rClient.hget(key, 'cWeather', function (err, reply) {
        //logger.info('poi hget err?', err);
        //logger.info('poi hget reply?', reply);
        if (err) {
            reject(err);
        }
        else{
            resolve(reply);
        }
    });
}

var buildSFPoi=function() {
    return new promise(function (parentResolve, parentReject) {
        //todo: this should probably not pull in all client nearest PWS but fudge for now
        var arr=[];

        rClient.keys('*', function (err, keys) {
            if (err) {
                logger.error('no keys?', err);
                parentReject(err);
            }
            promise.map(keys,function(key){
                return new promise(function(resolve, reject){
                   poiMapPromise(resolve, reject, key);
                }).then(function(res){
                        arr.push(res);

                }).catch(function(e){
                        parentReject(e);
                });
            }).then(function(){
                parentResolve(arr);
            });
        });
    });
};

var setSportScores = function(){
    return new promise(function (resolve, reject) {

        promise.map([config.blNBAUrl,config.blMLBUrl],function(idx){
                logger.info('URI?',idx);
            return api.getRest(idx).then(function (res) {


               return dataHelpers.parseBLData(res).then(function (scores) {
                   //note: this is how you inline promise these = also try 'then' instead of 'each' and use abstract func for hset promisifyed
                   return new promise(function(resolve) {
                       rClient.hset('sportsTicker', idx, JSON.stringify(scores), function (err, reply) {
                           if (err) {
                               reject(err);
                           }
                           //todo: does redisclient reply only assert true when a new has key created?
                           console.log('hset reply?', reply);
                           resolve(scores);
                       });
                   });

                });
            });

        }).each(function(res){
            resolve(res);

        });
    });

};


var getSportsScores=function() {
    var dataArr=[];
    return new promise(function (resolve) {
        return new promise.map([config.blMLBUrl, config.blNBAUrl], function (idx) {
            return dataHelpers.getCacheData('sportsTicker', idx).then(function (data) {

                logger.warn('data[0]=?',JSON.parse(data));
                data=JSON.parse(data);

                logger.warn('data++++ parsed?',typeof data);

                switch(true){

                    case idx===config.blMLBUrl:
                        logger.info('matched MLB!');
                        data[0]='MLB: '+data[0];
                        break;
                    case idx===config.blNBAUrl:
                        data[0]='NBA: '+data[0];
                        break;
                }

                dataArr.push(data);
            });
        }).then(function(){

                var merged=[];

                logger.info('orig type?=', typeof merged);
                //combine arrays
                _.each(dataArr,function(d){
                    merged=merged.concat(d);
                });


               var parsed=_.map(merged,function(obj){
                    logger.info('item=',obj);
                    return {title:obj};
                });

                resolve(parsed);
        });
    });
};


module.exports = {
    getOrSetWUStationData:getOrSetWUStationData,
    setWUStationData:setWUStationData,
    getWUStationData:getWUStationData,
    setSFData:setSFData,
    buildSFPoi:buildSFPoi,
    setSportScores:setSportScores,
    getSportsScores:getSportsScores,
    rClient:rClient
};
