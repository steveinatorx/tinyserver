/*
 * tinyserver
 * https://github.com/stevenbrezina/tinyserver
 *
 * Copyright (c) 2015 steveinatorx
 * Licensed under the MIT license.
 */

'use strict';

var winston=require('winston');


var logger=new winston.Logger({});
logger.add(winston.transports.File, { 

  filename: "../log/dev.log",
  prettyPrint: true,
  colorize: true

});

logger.add(winston.transports.Console, { 
  prettyPrint: true,
  colorize: true
});

logger.info('Chill Winston, the logs are being captured...');

module.exports=logger;
