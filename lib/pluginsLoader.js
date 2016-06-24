'use strict'

const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const log = ioc.lib.get('logger').child({component: 'pluginsLoader'})
const dataSources = ioc.get('dataSources')

const pluginLoadOrder = [
  'theme',
  'ticketRegistry',
  'serviceRegistry',
  'auth',
  'misc'
]

const plugins = {}
const post = {}

function processSingle (type, context) {
  log.debug('processing plugin type: %s', type)
  const p = config.plugins[type]
  const pconf = config.pluginsConf[p.name] || {}
  if (p.hasOwnProperty('plugin')) {
    log.debug('initializing plugin: %s', p.name)
    const _context = Object.assign(
      context, {logger: context.logger.child({plugin: p.name})}
    )
    const initResult = p.plugin(pconf, _context)
    if (initResult instanceof Promise) {
      initResult.then((result) => {
        plugins[type] = result
        return Promise.resolve()
      })
      .catch((e) =>
        log.error('plugin %s return error: %s', p.name, e.message)
      )
    } else {
      plugins[type] = initResult
    }
    if (p.hasOwnProperty('postInit')) {
      post[type] = [p]
    }
  } else {
    log.info('%s does not export plugin function', p.name)
  }
}

function processArray (type, context) {
  log.debug('processing plugins type array: %s', type)
  if (!Array.isArray(config.plugins[type])) {
    throw new Error('plugins type not an array: %s', type)
  }
  if (!plugins.hasOwnProperty(type)) {
    plugins[type] = []
  }
  if (!post.hasOwnProperty(type)) {
    post[type] = []
  }
  for (const p of config.plugins[type]) {
    log.debug('initializing plugin: %s', p.name)
    if (!p.hasOwnProperty('plugin')) {
      log.info('%s does not export plugin function', p.name)
      continue
    }
    const pconf = config.pluginsConf[p.name] || {}
    const _context = Object.assign(
      context, {logger: context.logger.child({plugin: p.name})}
    )
    const initResult = p.plugin(pconf, _context)
    if (initResult instanceof Promise) {
      initResult.then((result) => {
        log.debug('loaded plugin: %s', p.name)
        plugins[type].push(result)
        return Promise.resolve()
      })
      .catch((e) => log.error('plugin %s return error: %s', p.name, e.message))
    } else {
      log.debug('loaded plugin: %s', p.name)
      plugins[type].push(initResult)
    }
    if (p.hasOwnProperty('postInit')) {
      post[type].push(p)
    }
  }
}

function phase1 () {
  log.debug('processing plugins: phase 1')

  for (const type of pluginLoadOrder) {
    const context = {
      logger: ioc.lib.get('logger'),
      dataSources: dataSources,
      marko: ioc.get('marko'),
      ticketLifetimes: config.tickets
    }

    switch (type) {
      // config values that are a single plugin
      case 'theme':
      case 'ticketRegistry':
      case 'serviceRegistry':
        processSingle(type, context)
        break

      // config values that are an array of plugins
      case 'auth':
      case 'misc':
        processArray(type, context)
        break
      default:
    }

    delete config.plugins[type]
  }

  log.debug('finished phase 1')
  return plugins
}

function phase2 (server, hooks) {
  log.debug('processing plugins: phase 2')

  function registerHooks (pname, inHooks) {
    for (const h of Object.keys(inHooks)) {
      hooks[h][pname] = inHooks[h]
    }
  }

  for (const type of pluginLoadOrder) {
    if (!Array.isArray(post[type])) {
      continue
    }
    for (const p of post[type]) {
      log.debug('post initializing plugin: %s', p.name)
      p.postInit({
        server: server,
        ticketRegistry: plugins.ticketRegistry
      })
      .then((result) => {
        if (result && result.hasOwnProperty('hooks')) {
          registerHooks(p.name, result.hooks)
        }
        return Promise.resolve()
      })
      .catch((err) => {
        log.error(`plugin '${p.name}' post init failed: ${err.message}`)
      })
    }

    delete post[type]
  }
}

module.exports = {phase1, phase2}
