'use strict';

const logger = require('pino')({level: 'fatal'});

module.exports = function setupIOC() {
  delete require.cache[require.resolve('laic')];
  const laic = require('laic').laic;

  laic.addNamespacePath('casServer/lib');
  laic.casServer.lib.register('logger', logger);

  const config = require('./config');
  laic.casServer.register('config', config);

  const marko = require('marko');
  const markoCompiler = require('marko/compiler');
  const markoOptions = Object.assign(
    {
      writeToDisk: false,
      checkUpToDate: true
    },
    (config.server) ? config.server.marko || {} : {}
  );
  markoCompiler.defaultOptions.writeToDisk = markoOptions.writeToDisk;
  markoCompiler.defaultOptions.checkUpToDate = markoOptions.checkUpToDate;
  laic.casServer.register('marko', marko, false);

  laic.casServer.register('plugins', {
    auth: [require('../mocks/auth').plugin()],
    theme: require('../mocks/theme').plugin(),
    ticketRegistry: require('../mocks/ticketRegistry').plugin(),
    serviceRegistry: require('../mocks/serviceRegistry').plugin()
  });

  laic.casServer.register('hooks', {
    userAttributes: {
      auth: require('../mocks/auth').postInit()
    }
  });
};
