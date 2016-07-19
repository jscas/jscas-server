'use strict'

const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const log = ioc.lib.get('logger').child({component: 'loadDataSources'})

module.exports = {
  knex: null,
  mongoose: null
}

if (config.dataSources) {
  if (config.dataSources.knex) {
    log.debug('initializing knex data source')
    const Knex = require('knex')
    try {
      module.exports.knex = new Knex(config.dataSources.knex)
    } catch (e) {
      log.error('could not load knex: %j', e)
    }
  }

  if (config.dataSources.mongoose) {
    log.debug('initializing mongoose data source')
    const mongoose = require('mongoose')
    try {
      module.exports.mongoose = mongoose.connect(
        config.dataSources.mongoose.uri,
        config.dataSources.mongoose.options
      )
    } catch (e) {
      log.error('could not load mongoose: %j', e)
    }
  }
}

log.debug('dataSources = %j', module.exports)
