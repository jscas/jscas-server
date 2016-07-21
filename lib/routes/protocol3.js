'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const path = require('path')
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'protocol3'})
const ticketRegistry = ioc.get('plugins').ticketRegistry
const hooks = ioc.get('hooks')
const getService = require(path.join(__dirname, '..', 'getService'))
const getParameter = require(path.join(__dirname, '..', 'getParameter'))

const xml = require('../xml')

const errorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TICKET_SPEC: 'INVALID_TICKET_SPEC',
  UNAUTHORIZED_SERVICE_PROXY: 'UNAUTHORIZED_SERVICE_PROXY',
  INVALID_PROXY_CALLBACK: 'INVALID_PROXY_CALLBACK',
  INVALID_TICKET: 'INVALID_TICKET',
  INVALID_SERVICE: 'INVALID_SERVICE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

function serviceValidate (req, reply) {
  log.debug(`got /p3/serviceValidate ${req.method.toUpperCase()}`)
  const service = decodeURIComponent(getParameter(req, 'service'))
  const stId = getParameter(req, 'ticket')

  if (!stId || !service) {
    return reply(xml.invalidST.stream({
      code: errorCodes.INVALID_REQUEST,
      message: 'Missing required parameter(s)'
    }))
  }

  const pgtUrl = getParameter(req, 'pgtUrl')
  const renew = getParameter(req, 'renew')
  // const format = req.params.format || req.query.format; // not supported yet
  log.debug('serviceValidate parameters: %j', {service, stId, pgtUrl, renew})

  function * doValidate () {
    const dbService = yield * getService(service)
    if (!dbService) {
      log.error('service not recognized')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_SERVICE,
        message: `service ${service} was not recognized`
      }))
    }

    let st
    try {
      log.debug('validating service ticket: %s', stId)
      st = yield ticketRegistry.getST(stId)
      if (new Date(st.expires) < new Date()) {
        throw new Error('service ticket expired')
      }
      log.debug('valid service ticket')
    } catch (e) {
      log.error('invalid service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `ticket ${stId} was not recognized`
      }))
    }

    let tgt
    try {
      log.debug('getting tgt for st: %s', stId)
      tgt = yield ticketRegistry.getTGTbyST(stId)
      log.debug('got tgt: %s', tgt.tid)
    } catch (e) {
      log.error('unable to get tgt for st: %s', stId)
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `tgt for ${stId} could not be found`
      }))
    }

    try {
      log.debug('invalidating st: %s', stId)
      st = yield ticketRegistry.invalidateST(stId)
      log.debug('service ticket invalidated: %s', st.tid)
    } catch (e) {
      log.error('could not invalidate service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INTERNAL_ERROR,
        message: `service ticket ${stId} could not be invalidated`
      }))
    }

    let attributes = {}
    for (const plugin of Object.keys((hooks) ? hooks.userAttributes : {})) {
      try {
        const data = yield hooks.userAttributes[plugin](tgt.userId)
        log.debug('retrieved attributes: %j', data)
        attributes = Object.assign(attributes, data)
      } catch (e) {
        log.error('could not retrieve user attributes via plugin: %s', plugin)
        log.debug(e.message)
      }
    }

    if (service) {
      try {
        st.serviceId = dbService.name
        log.debug('tracking service for logout: %s', st.serviceId)
        yield ticketRegistry.trackServiceLogin(st, tgt, service)
      } catch (e) {
        // We don't care. `/logout` is not a guaranteed operation.
      }
    }

    log.debug('returning %s: %j', tgt.userId, attributes)
    return reply(xml.validST.stream({
      username: tgt.userId,
      attributes: {
        standardAttributes: attributes.standardAttributes || {},
        extraAttributes: attributes.extraAttributes
      }
    }))
  }

  return Promise.coroutine(doValidate)()
}

const getRoute = {
  path: '/p3/serviceValidate',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  },
  handler: serviceValidate
}

const postRoute = Object.assign({}, getRoute)
postRoute.method = 'POST'

module.exports = [getRoute, postRoute]
