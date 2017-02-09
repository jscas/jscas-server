'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const hooks = ioc.get('hooks')
const getParameter = introduce('../getParameter')
const cas = introduce('../casInterface')

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
  req.logger.debug('got /p3/serviceValidate %s', req.method.toUpperCase())
  const service = decodeURIComponent(getParameter(req, 'service'))
  const stId = getParameter(req, 'ticket')

  if (!stId || !service) {
    req.logger.debug('missing required parameters: st and/or service')
    return reply(xml.invalidST.stream({
      code: errorCodes.INVALID_REQUEST,
      message: 'Missing required parameter(s)'
    }))
  }

  const pgtUrl = getParameter(req, 'pgtUrl')
  const renew = getParameter(req, 'renew')
  // const format = req.params.format || req.query.format; // not supported yet
  req.logger.debug('serviceValidate parameters: (service: %s, stId: %s, pgtUrl: %s, renew: %s)', service, stId, pgtUrl, renew)

  function * doValidate () {
    const dbService = yield cas.getService(service)
    if (!dbService) {
      req.log(['error', 'protocol3'], 'service not recognized')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_SERVICE,
        message: `service ${service} was not recognized`
      }))
    }

    let st
    try {
      req.logger.debug('validating service ticket: %s', stId)
      st = yield cas.getServiceTicket(stId)
      if (st.expired) throw new Error('service ticket expired')
      req.logger.debug('valid service ticket')
    } catch (e) {
      req.logger.error('invalid service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `ticket ${stId} was not recognized`
      }))
    }

    let tgt
    try {
      req.logger.debug('getting tgt for st: %s', stId)
      tgt = yield cas.getTicketGrantingTicketByServiceTicket(stId)
      req.logger.debug('got tgt: %s', tgt.tid)
    } catch (e) {
      req.logger.error('unable to get tgt for st: %s', stId)
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `tgt for ${stId} could not be found`
      }))
    }

    try {
      req.logger.debug('invalidating st: %s', stId)
      st = yield cas.invalidateServiceTicket(stId)
      req.logger.debug('service ticket invalidated: %s', st.tid)
    } catch (e) {
      req.logger.error('could not invalidate service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INTERNAL_ERROR,
        message: `service ticket ${stId} could not be invalidated`
      }))
    }

    let attributes = {}
    for (const plugin of Object.keys((hooks) ? hooks.userAttributes : {})) {
      try {
        const data = yield hooks.userAttributes[plugin](tgt.userId)
        req.logger.debug('retrieved attributes: %j', data)
        attributes = Object.assign(attributes, data)
      } catch (e) {
        req.logger.error('could not retrieve user attributes via plugin `%s`: %s', plugin, e.message)
        req.logger.debug(e.stack)
      }
    }

    if (service) {
      try {
        st.serviceId = dbService.name
        req.logger.debug('tracking service for logout: %s', st.serviceId)
        yield cas.trackServiceLogin(st, tgt, service)
      } catch (e) {
        // We don't care. `/logout` is not a guaranteed operation.
      }
    }

    req.logger.debug('returning %s: %j', tgt.userId, attributes)
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
