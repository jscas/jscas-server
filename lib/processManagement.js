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

function stopMongoose() {
  if (!dataSources.mongoose) {
    return Promise.resolve();
  }
  log.info('stopping mongoose');
  return dataSources.mongoose.disconnect();
}

function stopDataSources() {
  return stopKnex()
    .then(() => log.info('knex stopped'))
    .catch((err) => log.error('error stopping knex: %j', err))
    .then(stopMongoose)
    .catch((err) => log.error(err))
    .then(() => log.info('mongoose stopped'));
    // .then(stopNextSource)....
}

function shutdown() {
  stopDataSources()
    .then(() => log.info('stopping web server'))
    .then(() => {
      /* eslint promise/always-return: "off" */
      const server = ioc.get('server');
      if (server) {
        server.stop(() => log.info('web server stopped'));
      }
    })
    .catch((err) => {
      log.error('shutdown failed: %j', err);
      log.error('terminating ungracefully');
      process.exit(1);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
