'use strict'

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

  const sessionObj = {
    register: require('hapi-easy-session'),
    options: config.session
  }
  server.register(sessionObj, (err) => {
    if (err) {
      log.debug(err)
    } else {
      log.debug('session manager: %j', server._plugins)
    }
  })

  server.state(config.tgcName, config.state)
  server.on('request-internal', (request, event, tags) => {
    if (tags.error && tags.state) {
      log.error(event)
    }
  })

  const routes = introduce('routes')
  log.debug('routes: %j', routes)
  server.route(routes)

  return server
}
