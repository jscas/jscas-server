'use strict';

const log = require('laic').laic.casServer.lib.get('logger');

const yargs = require('yargs');
let argv;

function loadcmd(cmd) {
  log.debug('loading command: %s', cmd);
  return require(`${__dirname}/${cmd}`)(argv);
}

yargs
  .command('run', 'start server', loadcmd('runcmd'))
  .help('help');

module.exports = yargs.argv;
