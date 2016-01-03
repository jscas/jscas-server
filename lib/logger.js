'use strict';

const winston = require('winston');

module.exports = function logger(config) {
  let conf = config || {};
  conf = (conf.hasOwnProperty('winston')) ? config.winston : {
    transports: [new (winston.transports.Console)({
      level: 'debug',
      colorize: true
    })]
  };
  return new winston.Logger(conf);
};

module.exports['@requires'] = [ 'config' ];
module.exports['@singleton'] = true;
