'use strict'

const fp = require('fastify-plugin')
const errorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TICKET_SPEC: 'INVALID_TICKET_SPEC',
  UNAUTHORIZED_SERVICE_PROXY: 'UNAUTHORIZED_SERVICE_PROXY',
  INVALID_PROXY_CALLBACK: 'INVALID_PROXY_CALLBACK',
  INVALID_TICKET: 'INVALID_TICKET',
  INVALID_SERVICE: 'INVALID_SERVICE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

function localError (message, code) {
  const error = Error(message)
  Object.defineProperties(error, {
    code: {value: code},
    isError: {value: true}
  })
  return error
}

async function validateService (serviceUrl) {
  const casInterface = this.jscasInterface
  try {
    const service = await casInterface.getService(serviceUrl)
    if (!service) {
      return localError(
        `{serviceUrl} was not recognized`,
        errorCodes.INVALID_SERVICE
      )
    }
    return service
  } catch (e) {
    return localError(e.message, errorCodes.INTERNAL_ERROR)
  }
}

async function validateST (ticketId) {
  const casInterface = this.jscasInterface
  try {
    const serviceTicket = await casInterface.getServiceTicket(ticketId)
    if (serviceTicket.expired && serviceTicket.valid) {
      return localError('service ticket expired', errorCodes.INVALID_TICKET)
    }
    return serviceTicket
  } catch (e) {
    return localError(e.message, errorCodes.INVALID_TICKET)
  }
}

async function invalidateST (ticketId) {
  const casInterface = this.jscasInterface
  try {
    return await casInterface.invalidateServiceTicket(ticketId)
  } catch (e) {
    return localError(e.message, errorCodes.INTERNAL_ERROR)
  }
}

async function getTGT (serviceTicketId) {
  const casInterface = this.jscasInterface
  try {
    return await casInterface.getTicketGrantingTicketByServiceTicket(serviceTicketId)
  } catch (e) {
    return localError(e.message, errorCodes.INVALID_TICKET)
  }
}

async function trackService (serviceTicket, ticketGrantingTicket, service) {
  const casInterface = this.jscasInterface
  try {
    await casInterface.trackServiceLogin(serviceTicket, ticketGrantingTicket, service)
  } catch (e) {
    // We don't care. `/logout` is not a guaranteed operation.
  }
  return true
}

// This is used by protocols v2 and v3 since they share all of this logic.
function ticketUtils (fastify, options, next) {
  fastify.decorate('jscasValidationErrors', errorCodes)
  fastify.decorate('validateService', validateService)
  fastify.decorate('validateST', validateST)
  fastify.decorate('invalidateST', invalidateST)
  fastify.decorate('getTGT', getTGT)
  fastify.decorate('trackService', trackService)
  next()
}

module.exports = fp(ticketUtils)
