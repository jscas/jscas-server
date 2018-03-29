'use strict'

const fp = require('fastify-plugin')

function validateRoutePlugin (fastify, options, next) {
  const casInterface = fastify.jscasInterface

  fastify.get('/validate', async function validateHandler (req, reply) {
    const no = 'no\n'
    const yes = 'yes\n'
    const ticketId = req.query.ticket
    const serviceUrl = req.query.service
    let service

    if (!ticketId || !serviceUrl) return no
    // We might have a valid Service Ticket, but the service requested that
    // we ignore SSO logins. In this case, invalidating the ST would merely
    // slow things down. ST lifetimes *should* be low enough that we can just
    // let them expire via timeout.
    if (req.session.isAuthenticated && req.session.renewal) {
      req.log.info('received service validation for forced login authenticated via sso')
      return no
    }

    try {
      req.log.debug('retrieving service: %s', serviceUrl)
      service = await casInterface.getService(serviceUrl)
      if (!service) {
        req.log.debug('could not find service matching')
        return no
      }
    } catch (e) {
      req.log.error('could not retrieve service: %s', e.message)
      req.log.debug(e.stack)
      return no
    }

    let serviceTicket
    try {
      req.log.debug('validating service ticket: %s', ticketId)
      serviceTicket = await casInterface.getServiceTicket(ticketId)
      if (serviceTicket.expired) throw Error('service ticket expired')
      req.log.debug('valid service ticket')
    } catch (e) {
      req.log.error('invalid service ticket: %s', e.message)
      req.log.debug(e.stack)
      return no
    }

    try {
      serviceTicket = await casInterface.invalidateServiceTicket(ticketId)
      req.log.debug('service ticket invalidated: %s', serviceTicket.tid)
    } catch (e) {
      req.log.error('could not invalidate service ticket: %s', e.message)
      req.log.debug(e.stack)
      return no
    }

    return yes
  })

  next()
}

module.exports = fp(validateRoutePlugin)
