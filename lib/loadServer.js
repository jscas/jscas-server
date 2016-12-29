'use strict'

const os = require('os')

module.exports = function runServer () {
  const introduce = require('introduce')(__dirname)
  const ioc = require('laic').laic.casServer
  const log = ioc.lib.get('logger').child({component: 'loadServer'})
  const config = ioc.get('config').server
  const errorHandler = introduce('errorHandler')

  const hapi = require('hapi')
  const server = (config.cache)
    ? new hapi.Server({cache: config.cache})
    : new hapi.Server()

  server.connection(config.connection)
  server.ext('onPreResponse', errorHandler)

  const hapiPino = {
    register: require('hapi-pino'),
    options: {
      instance: ioc.lib.get('logger')
    }
  }
  server.register(hapiPino, (err) => {
    if (err) {
      log.error('could not load hapi-pino: %s', err.message)
      process.kill(process.pid, os.constants.SIGTERM)
    }
    log.debug('registered hapi-pino')
  })

  const sessionObj = {
    register: require('hapi-easy-session'),
    options: config.session
  }
  server.register(sessionObj, (err) => {
    if (err) {
      log.error('could not load hapi-easy-session: %s', err.message)
      log.debug(err.stack)
      process.kill(process.pid, os.constants.SIGTERM)
    } else {
      log.debug('session manager: %j', server._plugins)
    }
  })

  server.state(config.tgcName, config.state)
  server.on('request-internal', (request, event, tags) => {
    // Intercept cookie parsing errors and log them
    if (tags.error && tags.state) {
      log.error(event)
    }
  })

  const routes = introduce('routes')
  log.debug('routes: %j', routes)
  setImmediate(() => server.route(routes))

  return server
}
