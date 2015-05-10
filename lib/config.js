'use strict';

var config={
  wundergroundHourlyUrl:'http://api.wunderground.com/api/' + process.env.WUNDERGROUNDAPIKEY +'/hourly/q/CA/San_Francisco.json',
  wundergroundGeoLookupPartialUrl:'http://api.wunderground.com/api/'+process.env.WUNDERGROUNDAPIKEY+'/geolookup/q/',
  wundergroundPWSPartialUrl:'http://api.wunderground.com/api/'+process.env.WUNDERGROUNDAPIKEY+'/conditions/q/pws:',
  blNBAUrl:'http://sports.espn.go.com/nba/bottomline/scores',
  blMLBUrl:'http://sports.espn.go.com/mlb/bottomline/scores'
};

module.exports=config;
