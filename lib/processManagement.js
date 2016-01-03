'use strict';

const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger');
const plugins = ioc.get('plugins');

function shutdown() {
  const ticketRegistry = plugins.ticketRegistry;
  const serviceRegistry = plugins.serviceRegistry;

  ticketRegistry.close()
    .then(serviceRegistry.close.bind(serviceRegistry))
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
