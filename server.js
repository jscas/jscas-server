'use strict';

const path = require('path');
const ioc = require('laic').laic.addNamespace('casServer');
ioc.loadFile('lib/logger');

const argv = require(path.join(__dirname, 'lib', 'cli'));

let config;
if (argv.hasOwnProperty('config')) {
  try {
    const fp = path.resolve(argv.config);
    config = require(fp);
    ioc.register('config', config, false);
  } catch (e) {
    console.error('could not load configuration: %s', e.message);
    process.exit(1);
  }
}

// re-initialize the logger with the user supplied transports configuration
const log = ioc.loadFile('lib/logger').get('logger');

// phase one plugins must be initialized immediately after loading the
// configuration and logger, otherwise dependent parts will not have
// access to them
const pluginsLoader = require(path.join(__dirname, 'lib', 'pluginsLoader'));
const phase1 = pluginsLoader.phase1();
ioc.register('plugins', phase1, false);

const hooks = {
  userAttributes: {}
};
ioc.register('hooks', hooks, false);

let server;
if (argv._.indexOf('run') !== -1) {
  server = require(__dirname + '/lib/loadServer')(argv);
  ioc.register('server', server, false);
  server.start(function(error) {
    if (error) {
      log.error('could not start web server: %s', error.message);
      log.debug(error);
    }
    log.debug('web server started');
    log.info('web server address: %s', server.info.uri);
    require(__dirname + '/lib/processManagement');

    pluginsLoader.phase2(server, hooks);
  });
}
