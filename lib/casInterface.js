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
 * @param {string} username The id of the user that will own the ticket
 * granting ticket.
 * @returns {Promise}
 */
CAS.createTicketGrantingTicket = function * createTicketGrantingTicket (username) {
  try {
    log.trace('generating ticket granting ticket for login user: %s', username)
    const ticket = yield ticketRegistry.genTGT(
      username,
      new Date(Date.now() + config.tickets.ticketGrantingTicketTTL)
    )
    log.trace('created ticket granting ticket with id: %s', ticket.tid)
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

Object.keys(CAS).forEach((k) => { CAS[k] = Promise.coroutine(CAS[k]) })

module.exports = CAS
