'use strict'

const Promise = require('bluebird')
const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const log = ioc.lib.get('logger').child({component: 'loadDataSources'})

function loadKnex () {
  return new Promise((resolve) => {
    if (!config.dataSources.knex) return resolve(undefined)
    log.debug('initializing knex data source')
    try {
      const Knex = require('knex')
      const knex = new Knex(config.dataSources.knex)
      return resolve(knex)
    } catch (e) {
      log.error('could not load knex: %s', e.message)
      log.debug(e.stack)
      return resolve(undefined)
    }
  })
}

function loadMongoose () {
  return new Promise((resolve) => {
    if (!config.dataSources.mongoose) return resolve(undefined)
    log.debug('initializing mongoose data source')
    try {
      const mongoose = require('mongoose')
      mongoose.Promise = Promise
      return mongoose
        .connect(
          config.dataSources.mongoose.uri,
          config.dataSources.mongoose.options
        ).then(() => {
          log.debug('mongoose datasource connected')
          return resolve(mongoose)
        })
        .catch((e) => {
          log.error('could not connect to mongodb: %s', e.message)
          log.debug(e.stack)
          return resolve(undefined)
        })
    } catch (e) {
      log.error('could not load mongoose: %s', e.message)
      log.debug(e.stack)
      return resolve(undefined)
    }
  })
}

function loadDataSources () {
  return new Promise((resolve) => {
    if (!config.dataSources) {
      return resolve({
        knex: undefined,
        mongoose: undefined
      })
    }

    return loadKnex()
      .then((knex) => loadMongoose().then((mongoose) => {
        log.debug('data sources loaded')
        return resolve({knex, mongoose})
      }))
  })
}

module.exports = loadDataSources()
