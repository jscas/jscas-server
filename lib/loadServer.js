'use strict';

module.exports = function runServer(argv) {
  const ioc = require('laic').laic.casServer;
  const log = ioc.lib.get('logger').child({component: 'loadServer'});
  const config = ioc.get('config').server;

  const hapi = require('hapi');
  const server = (config.cache) ?
    new hapi.Server({cache: config.cache}) : new hapi.Server();

  server.connection(config.connection);

  const sessionObj = {
    register: require('hapi-easy-session'),
    options: config.session
  };
  server.register(sessionObj, (err) => {
    if (err) {
      log.debug(err);
    } else {
      log.debug('session manager: %j', server._plugins);
    }
  });

  server.register({register: require('hapi-boom-decorators')}, (err) => {
    if (err) {
      log.debug(err);
    }
  });

  server.state(config.tgcName, config.state);
  server.on('request-internal', (request, event, tags) => {
    if (tags.error && tags.state) {
      log.error(event);
    }
  });

  const routes = require(__dirname + '/routes');
  log.debug('routes: %j', routes);
  server.route(routes);

  return server;
};
