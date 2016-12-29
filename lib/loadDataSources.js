'use strict'

const Promise = require('bluebird')
const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const log = ioc.lib.get('logger').child({component: 'loadDataSources'})

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

function loadPostgres () {
  return new Promise((resolve) => {
    if (!config.dataSources.postgres) return resolve(undefined)
    log.debug('initializing postgres data source')
    try {
      const pg = require('pg')
      const _config = Object.assign({}, {Promise}, config.dataSources.postgres)
      const pool = new pg.Pool(_config)
      return resolve(pool)
    } catch (e) {
      log.error('could not load postgres: %s', e.message)
      log.debug(e.stack)
      return resolve(undefined)
    }
  })
}

function loadDataSources () {
  return new Promise((resolve) => {
    if (!config.dataSources) {
      return resolve({
        mongoose: undefined,
        postgres: undefined
      })
    }

    return loadPostgres()
      .then((postgres) => loadMongoose().then((mongoose) => {
        log.debug('data sources loaded')
        return resolve({mongoose, postgres})
      }))
  })
}

module.exports = loadDataSources()
