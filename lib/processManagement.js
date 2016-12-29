'use strict'

const Promise = require('bluebird')
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'processManagement'})
const dataSources = ioc.get('dataSources')

function stopMongoose () {
  if (!dataSources.mongoose) {
    return Promise.resolve()
  }
  log.info('stopping mongoose')
  return dataSources.mongoose.disconnect()
}

function stopPostgres () {
  if (!dataSources.postgres) {
    return Promise.resolve()
  }
  log.info('stopping postgres')
  return dataSources.postgres.end()
}

function stopDataSources () {
  return stopPostgres()
    .then(() => log.info('postgres stopped'))
    .catch((err) => log.error('error stopping postgres: %j', err))
    .then(stopMongoose)
    .catch((err) => log.error(err))
    .then(() => log.info('mongoose stopped'))
    // .then(stopNextSource)....
}

function shutdown () {
  stopDataSources()
    .then(() => log.info('stopping web server'))
    .then(() => {
      const server = ioc.get('server')
      if (server) {
        server.stop(() => log.info('web server stopped'))
      }
    })
    .catch((err) => {
      log.error('shutdown failed: %j', err)
      log.error('terminating ungracefully')
      process.exit(1)
    })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
