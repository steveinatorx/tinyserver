'use strict';

//var config=require('./config.js');
var rp=require('request-promise');
var logger=require('./log');
var promise=require('bluebird');

var getRest=promise.method(function(url) {
  //logger.info('called getRest...');

  return new promise(function(resolve, reject){
    //logger.info('getRest called with:',url);
    rp(url).then(function(response){
      resolve(response);
    })
    .catch(function(err){
      logger.error('getRest error',err);
      reject(err);
    });

  });

});

module.exports={
  getRest:getRest  
};

