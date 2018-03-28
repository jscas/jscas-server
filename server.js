'use strict'

Error.stackTraceLimit = 100

require('make-promises-safe')
const path = require('path')
const config = require('./lib/config')
const log = require('./lib/logger')()

const server = require('fastify')({logger: log})
const fastifyCaching = require('fastify-caching')

const cachingConfig = config.get('caching')
const abcache = require('abstract-cache')(cachingConfig.cache)

server
  .register(require('fastify-no-icon'))
  .register(require('fastify-url-data'))
  .register(require('fastify-formbody'))
  .register(require('fastify-helmet'), config.get('helmet'))
  .register(require('fastify-cookie'))
  .register(fastifyCaching, {
    privacy: cachingConfig.privacy || fastifyCaching.privacy.NOCACHE,
    segment: cachingConfig.segment || 'jscas',
    cache: abcache
  })
  .register(require('fastify-server-session'), config.get('session'))
  .decorate('jscasTGTCookie', config.get('tickets.ticketGrantingTicket.cookieName'))

const dataSources = config.get('dataSources')
if (dataSources && dataSources.mongodb) {
  server.register(require('fastify-mongodb'), dataSources.mongodb)
}
if (dataSources && dataSources.postgres) {
  server.register(require('fastify-postgres'), dataSources.postgres)
}
if (dataSources && dataSources.redis) {
  server.register(require('fastify-redis'), dataSources.redis)
}

server
  .decorate('jscasHooks', {
    userAttributes: [],
    preAuth: []
  })
  .decorate('jscasPlugins', {
    attributeResolver: {
      async attributesFor (username) {
        return undefined
      }
    },
    ticketRegistry: {},
    serviceRegistry: {},
    theme: {},
    auth: [],
    misc: []
  })

const pluginsToLoad = config.get('plugins')
const pluginsConf = config.get('pluginsConf') || {}
if (!pluginsToLoad) {
  log.fatal('missing plugins to load configuration, cannot continue')
  process.kill(process.pid, 'SIGTERM')
  process.exit(1)
}
function resolvePlugin (inputName) {
  if (inputName.startsWith('~/')) {
    const internalName = path.join(__dirname, 'lib', 'plugins', inputName.substr(2))
    return require(internalName)
  }
  if (inputName.includes('>')) {
    const parts = inputName.split('>')
    try {
      const plugin = require(parts[0])
      return plugin[parts[1]]
    } catch (e) {
      log.error('could not find nested plugin `%s` from `%s`', parts[1], inputName)
      throw e
    }
  }
  return require(inputName)
}
const attributeResolverPlugin = resolvePlugin(pluginsToLoad.attributesResolver)
const ticketRegistryPlugin = resolvePlugin(pluginsToLoad.ticketRegistry)
const serviceRegistryPlugin = resolvePlugin(pluginsToLoad.serviceRegistry)
const themePlugin = resolvePlugin(pluginsToLoad.theme)

// Registration order is important. Some plugins are dependent on prior plugins
// being present, and we want our routes added before miscellaneous plugins.
server
  .register(resolvePlugin('~/pluginApiPlugin'))
  .register(attributeResolverPlugin, pluginsConf[attributeResolverPlugin.pluginName])
  .register(ticketRegistryPlugin, pluginsConf[ticketRegistryPlugin.pluginName])
  .register(serviceRegistryPlugin, pluginsConf[serviceRegistryPlugin.pluginName])
  .register(themePlugin, pluginsConf[themePlugin.pluginName])
  .register(resolvePlugin('~/errorHandlers'))
  .register(resolvePlugin('~/casInterfacePlugin'))
  .register(resolvePlugin('~/csrf'))
  .register(resolvePlugin('~/ticketUtils'))
  .register(require('./lib/routes/login'), {cookie: config.get('cookie')})
  .register(require('./lib/routes/logout'), {cookie: config.get('cookie')})
  .register(require('./lib/routes/serviceValidate'), {useV3: config.get('v3overv2')})
  .register(require('./lib/routes/slash'))
  .register(require('./lib/routes/success'))
  .register(require('./lib/routes/validate'))
  .register(require('./lib/routes/samlValidate'), {
    banner9Hack: config.get('saml11Banner9Hack'),
    sessionMaxAge: config.get('session.sessionMaxAge')
  })

for (const type of ['auth', 'misc']) {
  if (!pluginsToLoad[type]) continue
  for (const pluginName of pluginsToLoad[type]) {
    const pluginToLoad = resolvePlugin(pluginName)
    log.debug('registering %s plugin: %s', type, pluginToLoad.pluginName)
    server.register(pluginToLoad, pluginsConf[pluginToLoad.pluginName])
  }
}

server.ready((err) => {
  if (err) {
    log.error('could not boot server: %s', err.message)
    log.debug(err.stack)
    log.info('aborting startup')
    process.kill(process.pid, 'SIGTERM')
    process.exit(1)
  }
  server.listen(
    config.get('server').port,
    config.get('server').address,
    serverListenCB
  )
})

function serverListenCB (err) {
  if (err) {
    log.error('could not start web server: %s', err.message)
    log.debug(err.stack)
    process.kill(process.pid, 'SIGTERM')
    process.exit(1)
  }

  process.on('SIGINT', server.close.bind(server))
  process.on('SIGTERM', server.close.bind(server))

  if (process.send) process.send('ready')
}
