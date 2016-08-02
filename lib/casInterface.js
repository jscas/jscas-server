'use strict'

const Promise = require('bluebird')
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'casHandler'})
const config = ioc.get('config')
const serviceRegistry = ioc.get('plugins').serviceRegistry
const ticketRegistry = ioc.get('plugins').ticketRegistry

/**
 * An interface for performing CAS protocol operations. Each method returns
 * a `Promise` that either resolves with an expected result or rejects with an
 * `Error` describing what went wrong.
 *
 * @type {object}
 */
const CAS = {}

/**
 * Generates a new login ticket to be used for verifying login attempts.
 *
 * @returns {Promise}
 */
CAS.createLoginTicket = function * createLoginTicket () {
  try {
    const loginTicket = yield ticketRegistry.genLT(
      new Date(Date.now() + config.tickets.loginTicketTTL)
    )
    log.trace('login ticket created: %s', loginTicket.tid)
    return loginTicket
  } catch (e) {
    log.error('could not create login ticket: %s', e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Creates a new service ticket to be sent to remote services.
 *
 * @param {string} tgtId The ticket granting ticket id to associate with the
 * service ticket.
 * @param {string} serviceName The name of the service that will receive the
 * ticket.
 * @returns {Promise}
 */
CAS.createServiceTicket = function * createServiceTicket (tgtId, serviceName) {
  try {
    log.trace('creating service ticket for tgt: %s', tgtId)
    const ticket = yield ticketRegistry.genST(
      tgtId,
      new Date(Date.now() + config.tickets.serviceTicketTTL),
      serviceName
    )
    log.trace('created service ticket with id: %s', ticket.tid)
    return ticket
  } catch (e) {
    log.error('could not create service ticket for tgt `%s`: %s', tgtId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Creates a ticket granting ticket for a specified user. This is the user's
 * primary ticket upon which all service grants are bestowed.
 *
 * @param {string} loginTicketId The id for a valid login ticket to associate
 * with the ticket granting ticket.
 * @param {string} username The id of the user that will own the ticket
 * granting ticket.
 * @returns {Promise}
 */
CAS.createTicketGrantingTicket = function * createTicketGrantingTicket (loginTicketId, username) {
  try {
    log.trace('generating ticket granting ticket for login tickett: %s', loginTicketId)
    const ticket = yield ticketRegistry.genTGT(
      loginTicketId,
      username,
      new Date(Date.now() + config.tickets.ticketGrantingTicketTTL)
    )
    log.trace('created ticket granting ticket with id: %s', ticket.tid)
    return ticket
  } catch (e) {
    log.error('could not create ticket granting ticket for `%s`: %s', loginTicketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Retrieve an existing login ticket based on its identifier.
 *
 * @param {string} ticketId The desired login ticket's identifier.
 * @returns {Promise}
 */
CAS.getLoginTicket = function * getLoginTicket (ticketId) {
  try {
    log.trace('getting login ticket: %s', ticketId)
    const ticket = yield ticketRegistry.getLT(ticketId)
    log.trace('got login ticket: %s', ticket.tid)
    ticket.expired = false
    if (new Date(ticket.expires) < new Date()) {
      log.trace('login ticket expired')
      ticket.expired = true
    }
    return ticket
  } catch (e) {
    log.error('could not get login ticket `%s`: %s', ticketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Retrieve a service definition from the list of services allowed to use the
 * CAS server.
 *
 * @param {string} serviceUrl The URL for the remote service.
 * @returns {Promise}
 */
CAS.getService = function * getService (serviceUrl) {
  try {
    log.trace('getting service: %s', serviceUrl)
    const service = yield serviceRegistry.getServiceWithUrl(serviceUrl)
    log.trace('got service: %s', service.name)
    return service
  } catch (e) {
    log.error('could not get service `%s`: %s', serviceUrl, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Retrieve a pre-existing ticket granting ticket with a given identifier.
 *
 * @param {string} ticketId The desired ticket granting ticket's identifier.
 * @returns {Promise}
 */
CAS.getTicketGrantingTicket = function * getTGT (ticketId) {
  try {
    log.trace('finding ticket granting ticket: %s', ticketId)
    const ticket = yield ticketRegistry.getTGT(ticketId)
    ticket.expired = false
    if (new Date(ticket.expires) < new Date()) {
      log.trace('ticket granting ticket expired')
      ticket.expired = true
    }
    return ticket
  } catch (e) {
    log.error('could not find tgt `%s`: %s', ticketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Expire a login ticket.
 *
 * @param {string} ticketId The identifier for the ticket to expire.
 * @returns {Promise} The expired ticket will be passed back in the resolution.
 */
CAS.invalidateLoginTicket = function * invalidateLoginTicket (ticketId) {
  try {
    const ticket = yield ticketRegistry.invalidateLT(ticketId)
    log.trace('login ticket invalidated: %s', ticket.tid)
    return ticket
  } catch (e) {
    log.error('could not invalidate login ticket `%s`: %s', ticketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Validates a login ticket by its identifier.
 *
 * @param {string} ticketId The identifier for the login ticket.
 * @returns {Promise} The validated ticket will be passed back in the resolution.
 */
CAS.validateLoginTicket = function * validateLoginTicket (ticketId) {
  try {
    log.trace('validating login ticket: %s', ticketId)
    const ticket = yield ticketRegistry.getLT(ticketId)
    if (new Date(ticket.expires) < new Date()) {
      throw new Error('login ticket expired: %s', new Date(ticket.expires))
    }
    log.trace('login ticket validated: %s', ticketId)
    return ticket
  } catch (e) {
    log.error('invalid login ticket `%s`: %s', ticketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

Object.keys(CAS).forEach((k) => { CAS[k] = Promise.coroutine(CAS[k]) })

module.exports = CAS
