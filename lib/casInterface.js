'use strict'

/**
 * An interface for performing CAS protocol operations. Each method returns
 * a `Promise` that either resolves with an expected result or rejects with an
 * `Error` describing what went wrong.
 *
 * @type {object}
 */
const CAS = {}
CAS[Symbol.toStringTag] = function () {
  return 'CASInterface'
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
CAS.createServiceTicket = async function createServiceTicket (tgtId, serviceName) {
  try {
    this.log.debug('creating service ticket for tgt: %s', tgtId)
    const ticket = await this.ticketRegistry.genST(
      tgtId,
      serviceName,
      new Date(Date.now() + this.serviceTicketTTL)
    )
    this.log.debug('created service ticket with id: %s', ticket.tid)
    return ticket
  } catch (e) {
    this.log.error('could not create service ticket for tgt `%s`: %s', tgtId, e.message)
    this.log.debug(e.stack)
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
CAS.createTicketGrantingTicket = async function createTicketGrantingTicket (username) {
  try {
    this.log.debug('generating ticket granting ticket for login user: %s', username)
    const ticket = await this.ticketRegistry.genTGT(
      username,
      new Date(Date.now() + this.ticketGrantingTicketTTL)
    )
    this.log.debug('created ticket granting ticket with id: %s', ticket.tid)
    return ticket
  } catch (e) {
    this.log.error('could not create ticket granting ticket for `%s`: %s', username, e.message)
    this.log.debug(e.stack)
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
CAS.getService = async function getService (serviceUrl) {
  try {
    this.log.debug('getting service: %s', serviceUrl)
    return await this.serviceRegistry.getServiceWithUrl(serviceUrl)
  } catch (e) {
    this.log.error('could not get service `%s`: %s', serviceUrl, e.message)
    this.log.debug(e.stack)
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
CAS.getServiceTicket = async function getServiceTicket (ticketId) {
  try {
    this.log.debug('getting service ticket: %s', ticketId)
    const ticket = await this.ticketRegistry.getST(ticketId)
    ticket.expired = (new Date(ticket.expires)) < new Date()
    this.log.debug('got service ticket: %j', ticket)
    return ticket
  } catch (e) {
    this.log.error('could not get service ticket `%s`: %s', ticketId, e.message)
    this.log.debug(e.stack)
    throw e
  }
}

/**
 * Retrieve a pre-existing ticket granting ticket with a given identifier.
 *
 * @param {string} ticketId The desired ticket granting ticket's identifier.
 * @returns {Promise}
 */
CAS.getTicketGrantingTicket = async function getTGT (ticketId) {
  try {
    this.log.debug('finding ticket granting ticket: %s', ticketId)
    const ticket = await this.ticketRegistry.getTGT(ticketId)
    ticket.expired = false
    if (new Date(ticket.expires) < new Date()) {
      this.log.debug('ticket granting ticket expired')
      ticket.expired = true
    }
    return ticket
  } catch (e) {
    this.log.error('could not find tgt `%s`: %s', ticketId, e.message)
    this.log.debug(e.stack)
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
CAS.getTicketGrantingTicketByServiceTicket = async function getTGTbyST (serviceTicketId) {
  try {
    this.log.debug('getting ticket granting ticket associated with service ticket: %s', serviceTicketId)
    const ticket = await this.ticketRegistry.getTGTbyST(serviceTicketId)
    ticket.expired = (new Date(ticket.expires)) < new Date()
    this.log.debug('got ticket granting ticket: %j', ticket)
    return ticket
  } catch (e) {
    this.log.error('could not get ticket granting ticket for serivce ticket `%s`: %s', serviceTicketId, e.message)
    this.log.debug(e.stack)
    throw e
  }
}

/**
 * Update a service ticket in the ticket registry by marking it invalid.
 *
 * @param {string} ticketId Identifier for the ticket to invalidate.
 * @returns {Promise} The invalidated ticket will be passed back in the resolution.
 */
CAS.invalidateServiceTicket = async function invalidateServiceTicket (ticketId) {
  try {
    this.log.debug('invalidating service ticket: %s', ticketId)
    const ticket = await this.ticketRegistry.invalidateST(ticketId)
    this.log.debug('invalidated service ticket: %j', ticket)
    return ticket
  } catch (e) {
    this.log.error('could not invalidate serivce ticket `%s`: %s', ticketId, e.message)
    this.log.debug(e.stack)
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
CAS.trackServiceLogin = async function trackServiceLogin (serviceTicket, ticketGrantingTicket, serviceUrl) {
  try {
    this.log.debug('tracking login for service url: %s', serviceUrl)
    return await this.ticketRegistry.trackServiceLogin(serviceTicket, ticketGrantingTicket, serviceUrl)
  } catch (e) {
    this.log.error('could not track login for service url `%s`: %s', serviceUrl, e.message)
    this.log.debug(e.stack)
    throw e
  }
}

module.exports = function casInterfaceFactory (context) {
  const instance = Object.create(CAS)
  const config = require('./config')
  instance.log = require('./logger')().child({component: 'casInterface'})
  instance.ticketRegistry = context.ticketRegistry
  instance.serviceRegistry = context.serviceRegistry
  instance.serviceTicketTTL = config.get('tickets.serviceTicket.ttl')
  instance.ticketGrantingTicketTTL = config.get('tickets.ticketGrantingTicket.ttl')
  return instance
}
