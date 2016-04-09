'use strict';

const logger = require('pino')({level: 'fatal'});

module.exports = function setupIOC() {
  delete require.cache[require.resolve('laic')];
  const laic = require('laic').laic;

  laic.addNamespacePath('casServer/lib');
  laic.casServer.lib.register('logger', logger);
  laic.casServer.register('config', require('./config'));
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
