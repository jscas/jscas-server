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
    log.debug('creating service ticket for tgt: %s', tgtId)
    const ticket = yield ticketRegistry.genST(
      tgtId,
      new Date(Date.now() + config.tickets.serviceTicketTTL),
      serviceName
    )
    log.debug('created service ticket with id: %s', ticket.tid)
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
 * @param {string} username The id of the user that will own the ticket
 * granting ticket.
 * @returns {Promise}
 */
CAS.createTicketGrantingTicket = function * createTicketGrantingTicket (username) {
  try {
    log.debug('generating ticket granting ticket for login user: %s', username)
    const ticket = yield ticketRegistry.genTGT(
      username,
      new Date(Date.now() + config.tickets.ticketGrantingTicketTTL)
    )
    log.debug('created ticket granting ticket with id: %s', ticket.tid)
    return ticket
  } catch (e) {
    log.error('could not create ticket granting ticket for `%s`: %s', username, e.message)
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
    log.debug('getting service: %s', serviceUrl)
    const service = yield serviceRegistry.getServiceWithUrl(serviceUrl)
    log.debug('got service: %s', service.name)
    return service
  } catch (e) {
    log.error('could not get service `%s`: %s', serviceUrl, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Retrieve a service ticket from the ticket registry given the ticket
 * identifier.
 *
 * @param {string} ticketId The identifier of the ticket to retrieve.
 * @returns {Promise}
 */
CAS.getServiceTicket = function * getServiceTicket (ticketId) {
  try {
    log.debug('getting service ticket: %s', ticketId)
    const ticket = yield ticketRegistry.getST(ticketId)
    ticket.expired = (new Date(ticket.expires)) < new Date()
    log.debug('got service ticket: %j', ticket)
    return ticket
  } catch (e) {
    log.error('could not get service ticket `%s`: %s', ticketId, e.message)
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
    log.debug('finding ticket granting ticket: %s', ticketId)
    const ticket = yield ticketRegistry.getTGT(ticketId)
    ticket.expired = false
    if (new Date(ticket.expires) < new Date()) {
      log.debug('ticket granting ticket expired')
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
 * Retrieves a ticket granting ticket that was used to issue a given service
 * ticket.
 *
 * @param {string} serviceTicketId Ticket identifier for the associated service ticket.
 * @returns {Promise}
 */
CAS.getTicketGrantingTicketByServiceTicket = function * getTGTbyST (serviceTicketId) {
  try {
    log.debug('getting ticket granting ticket associated with service ticket: %s', serviceTicketId)
    const ticket = yield ticketRegistry.getTGTbyST(serviceTicketId)
    ticket.expired = (new Date(ticket.expires)) < new Date()
    log.debug('got ticket granting ticket: %j', ticket)
    return ticket
  } catch (e) {
    log.error('could not get ticket granting ticket for serivce ticket `%s`: %s', serviceTicketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Update a service ticket in the ticket registry by marking it invalid.
 *
 * @param {string} ticketId Identifier for the ticket to invalidate.
 * @returns {Promise} The invalidated ticket will be passed back in the resolution.
 */
CAS.invalidateServiceTicket = function * invalidateServiceTicket (ticketId) {
  try {
    log.debug('invalidating service ticket: %s', ticketId)
    const ticket = yield ticketRegistry.invalidateST(ticketId)
    log.debug('invalidated service ticket: %j', ticket)
    return ticket
  } catch (e) {
    log.error('could not invalidate serivce ticket `%s`: %s', ticketId, e.message)
    log.debug(e.stack)
    throw e
  }
}

/**
 * Stores a record of a service being authorized via a ticket granting ticket.
 * This allows services to be sent single log out requests.
 *
 * @param {object} serviceTicket A service ticket as returned by
 * {@link CAS#getServiceTicket}.
 * @param {object} ticketGrantingTicket A ticket granting ticket as returned by
 * {@link CAS#getTicketGrantingTicket}
 * @param {string} serviceUrl The service URL for the service being tracked.
 * @returns {Promise} The updated ticket granting ticket will be passed back
 * in the resolution.
 */
CAS.trackServiceLogin = function * (serviceTicket, ticketGrantingTicket, serviceUrl) {
  try {
    log.debug('tracking login for service url: %s', serviceUrl)
    const tgt = yield ticketRegistry.trackServiceLogin(serviceTicket, ticketGrantingTicket, serviceUrl)
    return tgt
  } catch (e) {
    log.error('could not track login for service url `%s`: %s', serviceUrl, e.message)
    log.debug(e.stack)
    throw e
  }
}

Object.keys(CAS).forEach((k) => { CAS[k] = Promise.coroutine(CAS[k]) })

module.exports = CAS
