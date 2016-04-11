'use strict';

const path = require('path');
const ioc = require('laic').laic.addNamespace('casServer');
ioc.loadFile('lib/logger');

function reqlib() {
  const args = [].concat([__dirname, 'lib'], Array.from(arguments));
  return require(path.join.apply(null, args));
}

const argv = reqlib('cli');
let config;
if (argv.config) {
  config = argv.config;
} else if (argv.settings) {
  config = argv.settings;
} else {
  config = './settings.js';
}
try {
  const fp = path.resolve(config);
  config = require(fp);
  ioc.register('config', config, false);
} catch (e) {
  console.error('could not load configuration: %s', e.message);
  process.exit(1);
}

// re-initialize the logger with the user supplied configuration
const log = ioc.loadFile('lib/logger').get('logger');

const dataSources = reqlib('loadDataSources');
ioc.register('dataSources', dataSources, false);

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
ioc.register('marko', marko, false);

// phase one plugins must be initialized immediately after loading the
// configuration and logger, otherwise dependent parts will not have
// access to them
const pluginsLoader = reqlib('pluginsLoader');
const phase1 = pluginsLoader.phase1();
ioc.register('plugins', phase1, false);

const hooks = {
  userAttributes: {}
};
ioc.register('hooks', hooks, false);

log.debug('loading Hapi web server');
const server = reqlib('loadServer')(argv);
ioc.register('server', server, false);
server.start(function(error) {
  if (error) {
    log.error('could not start web server: %s', error.message);
    log.debug(error);
  }
  log.debug('web server started');
  log.info('web server address: %s', server.info.uri);
  reqlib('processManagement');

  pluginsLoader.phase2(server, hooks);
});
