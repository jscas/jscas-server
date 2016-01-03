'use strict';

const ioc = require('laic').laic.casServer;
const config = ioc.get('config');
const log = ioc.lib.get('logger');

const pluginLoadOrder = [
  'theme',
  'ticketRegistry',
  'serviceRegistry',
  'auth',
  'misc'
];

const plugins = {};
const post = {};

function processSingle(type, context) {
  log.debug('processing plugin type: %s', type);
  let p = config.plugins[type];
  let pconf = config.pluginsConf[p.name] || {};
  if (p.hasOwnProperty('plugin')) {
    log.debug('initializing plugin: %s', p.name);
    plugins[type] = p.plugin(pconf, context);
    if (p.hasOwnProperty('postInit')) {
      post[type] = [p];
    }
  } else {
    log.info('%s does not export plugin function', p.name);
  }
}

function processArray(type, context) {
  log.debug('processing plugins type array: %s', type);
  for (let p of config.plugins[type]) {
    let pconf = config.pluginsConf[p.name] || {};
    if (p.hasOwnProperty('plugin')) {
      log.debug('intializing plugin: %s', p.name);
      let _p = p.plugin(pconf, context);
      if (Array.isArray(plugins[type])) {
        plugins[type].push(_p);
      } else {
        plugins[type] = [_p];
      }
      if (p.hasOwnProperty('postInit')) {
        if (Array.isArray(post[type])) {
          post[type].push(p);
        } else {
          post[type] = [p];
        }
      }
    } else {
      log.info('%s does not export plugin function', p.name);
    }
  }
}

function phase1() {
  log.debug('processing plugins: phase 1');

  for (let type of pluginLoadOrder) {
    const context = {
      logger: log
    };

    switch (type) {
      // config values that are a single plugin
      case 'theme':
      case 'ticketRegistry':
      case 'serviceRegistry':
        processSingle(type, context);
        break;

      // config values that are an array of plugins
      case 'auth':
      case 'misc':
        processArray(type, context);
        break;
    }

    delete config.plugins[type];
  }

  return plugins;
}

function phase2(server, hooks) {
  log.debug('processing plugins: phase 2');

  function registerHooks(pname, inHooks) {
    for (let h of Object.keys(inHooks)) {
      hooks[h][pname] = inHooks[h];
    }
  }

  for (let type of pluginLoadOrder) {
    if (!Array.isArray(post[type])) {
      continue;
    }
    for (let p of post[type]) {
      log.debug('post initializing plugin: %s', p.name);
      p.postInit({
          server: server,
          ticketRegistry: plugins.ticketRegistry
        })
        .then(function (result) {
          if (result && result.hasOwnProperty('hooks')) {
            registerHooks(p.name, result.hooks);
          }
        })
        .catch(function (err) {
          log.error(`plugin '${p.name}' post init failed: ${err.message}`);
        });
    }

    delete post[type];
  }
}

module.exports = {phase1, phase2};
