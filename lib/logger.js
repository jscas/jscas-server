'use strict';

const pino = require('pino');

module.exports = function logger(config) {
  let conf = config || {};
  conf = (conf.hasOwnProperty('pino')) ? config.pino : {
    name: 'jscas-server',
    level: 'info'
  };
  return pino(conf);
};

module.exports['@requires'] = [ 'config' ];
module.exports['@singleton'] = true;
