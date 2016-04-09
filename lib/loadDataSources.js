'use strict';

const ioc = require('laic').laic.casServer;
const config = ioc.get('config');
const log = ioc.lib.get('logger').child({component: 'loadDataSources'});

module.exports = {
  knex: null
};

if (!config.dataSources) {
  log.debug('config does not have dataSources attribute');
  return;
}

if (config.dataSources.knex) {
  log.debug('initializing knex data source');
  const Knex = require('knex');
  try {
    module.exports.knex = new Knex(config.dataSources.knex);
  } catch (e) {
    log.error('could not load knex: %j', e);
  }
}

log.debug('dataSources = %j', module.exports);
