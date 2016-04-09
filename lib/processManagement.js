'use strict';

const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger').child({component: 'processManagement'});
const dataSources = ioc.get('dataSources');

function stopKnex() {
  log.info('stopping knex');
  if (dataSources.knex) {
    return dataSources.knex.destroy();
  }
  return Promise.resolve();
}

function stopDataSources() {
  return stopKnex()
    .then(() => log.info('knex stopped'))
    .catch((err) => log.error('error stopping knex: %j', err));
    // .then(stopNextSource)....
}

function shutdown() {
  stopDataSources()
    .then(() => log.info('stopping web server'))
    .then(function() {
      const server = ioc.get('server');
      if (server) {
        server.stop(function () {
          log.info('web server stopped');
        });
      }
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
