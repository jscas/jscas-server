'use strict'

const conflate = require('conflate')
const fp = require('fastify-plugin')
const xml = require('../xml')

function serviceValidateRoutePlugin (fastify, options, next) {
  fastify.register(require('../plugins/ticketUtils'))
  fastify.decorateRequest('useV3', options.useV3 || false)

  async function serviceValidate (req, reply) {
    const serviceUrl = req.query.service
    const serviceTicketId = req.query.ticket
    // TODO: implment ?pgtUrl and ?renew
    // const pgtUrl = req.query.pgtUrl
    // const renew = req.query.renew

    const service = await fastify.validateService(serviceUrl)
    if (service.isError) {
      req.log.error('failed to validate service: %s', service.message)
      req.log.debug(service.stack)
      return xml.invalidST.renderToString({
        code: service.code,
        message: 'Missing required parameter(s)'
      })
    }

    let serviceTicket = await fastify.validateST(serviceTicketId)
    if (serviceTicket.isError) {
      req.log.error('failed to validate service ticket: %s', serviceTicket.message)
      req.log.debug(serviceTicket.stack)
      return xml.invalidST.renderToString({
        code: serviceTicket.code,
        message: `Ticket ${serviceTicketId} was not recognized`
      })
    }

    serviceTicket = await fastify.invalidateST(serviceTicketId)
    if (serviceTicket.isError) {
      req.log.error('failed to invalidate service ticket: %s', serviceTicket.message)
      req.log.debug(serviceTicket.stack)
      return xml.invalidST.renderToString({
        code: serviceTicket.code,
        message: `Service ticket ${serviceTicketId} could not be invalidated`
      })
    }

    const tgt = await fastify.getTGT(serviceTicketId)
    if (tgt.isError) {
      req.log.error('unable to get tgt for service ticket: %s', serviceTicketId)
      req.log.debug(tgt.stack)
      return xml.invalidST.renderToString({
        code: tgt.code,
        message: `TGT for ${serviceTicketId} could not be found`
      })
    }

    await fastify.trackService(serviceTicket, tgt, serviceUrl)

    // TODO: define the `authenticationDate` attribute by default
    // TODO: add support for adding the `isFromNewLogin` attribute
    let attributes
    if (req.useV3) {
      for (const hook of fastify.jscasHooks.userAttributes) {
        try {
          const data = await hook(tgt.userId)
          req.log.debug('retrieved attributes: %j', data)
          let memberOf = (attributes) ? attributes.memberOf || [] : []
          attributes = conflate(attributes || {}, data)
          if (data.memberOf) {
            const s1 = new Set(memberOf)
            const s2 = new Set(attributes.memberOf || [])
            attributes.memberOf = s1.union(s2)
          }
        } catch (e) {
          req.log.error('could not retrieve user attributes: %s', e.message)
          req.log.debug(e.stack)
        }
      }
    }

    const toSendXml = xml.validST.renderToString({
      username: tgt.userId,
      attributes
    })
    req.log.debug('sending xml: `%s`', Buffer.from(toSendXml, 'utf8').toString('hex'))
    reply.type('text/xml')
    return toSendXml
  }

  fastify.get('/serviceValidate', serviceValidate)
  fastify.get('/p3/serviceValidate', async function v3validate (req, reply) {
    req.useV3 = true
    return serviceValidate(req, reply)
  })

  next()
}

module.exports = fp(serviceValidateRoutePlugin)
