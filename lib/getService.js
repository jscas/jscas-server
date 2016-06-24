'use strict'

const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'getService'})
const serviceRegistry = ioc.get('plugins').serviceRegistry

module.exports = function * getService (serviceUrl) {
  let service
  try {
    log.debug('getting service: %s', serviceUrl)
    service = yield serviceRegistry.getServiceWithUrl(serviceUrl)
    log.debug('got service: %s', service.name)
  } catch (e) {
    log.error('could not get service: %s', serviceUrl)
    log.debug(e.message)
    return null
  }

  return service
}
