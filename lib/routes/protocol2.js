'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const introduce = require('introduce')(__dirname)
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
  req.log(['debug', 'protocol2'], `got /serviceValidate ${req.method.toUpperCase()}`)
  const service = decodeURIComponent(getParameter(req, 'service'))
  const stId = getParameter(req, 'ticket')

  if (!stId || !service) {
    req.log(['debug', 'protocol2'], 'missing required parameters: st and/or service')
    return reply(xml.invalidST.stream({
      code: errorCodes.INVALID_REQUEST,
      message: 'Missing required parameter(s)'
    }))
  }

  const pgtUrl = getParameter(req, 'pgtUrl')
  const renew = getParameter(req, 'renew')
  // const format = req.params.format || req.query.format; // not supported yet
  req.log(['debug', 'protocol2'], `serviceValidate parameters: (service: ${service}, stId: ${stId}, pgtUrl: ${pgtUrl}, renew: ${renew})`)

  function * doValidate () {
    const dbService = yield cas.getService(service)
    if (!dbService) {
      req.log(['error', 'protocol2'], 'service not recognized')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_SERVICE,
        message: `service ${service} was not recognized`
      }))
    }

    let st
    try {
      req.log(['debug', 'protocol2'], `validating service ticket: ${stId}`)
      st = yield cas.getServiceTicket(stId)
      if (st.expired && st.valid) throw new Error('service ticket expired')
      req.log(['debug', 'protocol2'], 'valid service ticket')
    } catch (e) {
      req.log(['error', 'protocol2'], 'invalid service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `ticket ${stId} was not recognized`
      }))
    }

    try {
      req.log(['debug', 'protocol2'], `invalidating st: ${stId}`)
      st = yield cas.invalidateServiceTicket(stId)
      req.log(['debug', 'protocol2'], `service ticket invalidated: ${st.tid}`)
    } catch (e) {
      req.log(['error', 'protocol2'], 'could not invalidate service ticket')
      return reply(xml.invalidST.stream({
        code: errorCodes.INTERNAL_ERROR,
        message: `service ticket ${stId} could not be invalidated`
      }))
    }

    let tgt
    try {
      req.log(['debug', 'protocol2'], `getting tgt for st: ${stId}`)
      tgt = yield cas.getTicketGrantingTicketByServiceTicket(stId)
      req.log(['debug', 'protocol2'], `got tgt: ${tgt.tid}`)
    } catch (e) {
      req.log(['error', 'protocol2'], `unable to get tgt for st: ${stId}`)
      return reply(xml.invalidST.stream({
        code: errorCodes.INVALID_TICKET,
        message: `tgt for ${stId} could not be found`
      }))
    }

    if (service) {
      try {
        st.serviceId = dbService.name
        req.log(['debug', 'protocol2'], `tracking service for logout: ${st.serviceId}`)
        yield cas.trackServiceLogin(st, tgt, service)
      } catch (e) {
        // We don't care. `/logout` is not a guaranteed operation.
      }
    }

    return reply(xml.validST.stream({
      username: tgt.userId
    }))
  }

  return Promise.coroutine(doValidate)()
}

const getRoute = {
  path: '/serviceValidate',
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
