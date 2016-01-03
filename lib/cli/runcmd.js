'use strict';

let argv;

function runcmd(yargs, _argv) {
  argv = yargs.options({
    config: {
      alias: 'c',
      desc: 'Path to settings.js file',
      demand: true,
      string: true
    }
  })
  .help('help')
  .argv;
}

module.exports = function (av) {
  argv = av;
  return runcmd;
};
