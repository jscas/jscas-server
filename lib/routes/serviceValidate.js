'use strict'

const conflate = require('conflate')
const fp = require('fastify-plugin')
const xml = require('../xml')

function serviceValidateRoutePlugin (fastify, options, next) {
  fastify.decorateRequest('useV3', options.useV3 || false)

  async function serviceValidate (req, reply) {
    const serviceUrl = req.query.service
    const serviceTicketId = req.query.ticket
    // TODO: implment ?pgtUrl
    // const pgtUrl = req.query.pgtUrl

    const renew = req.query.renew && (req.query.renew === 'true' || req.query.renew === true)
    if (renew && req.session.isAuthenticated) {
      req.log.info('received service validation for forced login authenticated via sso')
      reply.type('text/xml')
      return xml.invalidST.renderToString({
        code: 'INVALID_TICKET',
        message: 'Cannot validate via SSO login when renew was requested'
      })
    }

    const service = await fastify.validateService(serviceUrl)
    if (service.isError) {
      req.log.error('failed to validate service: %s', service.message)
      req.log.debug(service.stack)
      reply.type('text/xml')
      return xml.invalidST.renderToString({
        code: service.code,
        message: 'Missing required parameter(s)'
      })
    }

    let serviceTicket = await fastify.validateST(serviceTicketId)
    if (serviceTicket.isError) {
      req.log.error('failed to validate service ticket: %s', serviceTicket.message)
      req.log.debug(serviceTicket.stack)
      reply.type('text/xml')
      return xml.invalidST.renderToString({
        code: serviceTicket.code,
        message: `Ticket ${serviceTicketId} was not recognized`
      })
    }

    serviceTicket = await fastify.invalidateST(serviceTicketId)
    if (serviceTicket.isError) {
      req.log.error('failed to invalidate service ticket: %s', serviceTicket.message)
      req.log.debug(serviceTicket.stack)
      reply.type('text/xml')
      return xml.invalidST.renderToString({
        code: serviceTicket.code,
        message: `Service ticket ${serviceTicketId} could not be invalidated`
      })
    }

    const tgt = await fastify.getTGT(serviceTicketId)
    if (tgt.isError) {
      req.log.error('unable to get tgt for service ticket: %s', serviceTicketId)
      req.log.debug(tgt.stack)
      reply.type('text/xml')
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
          let memberOf = (attributes) ? (attributes.memberOf || []) : []
          attributes = conflate(attributes || {}, data)
          if (data.memberOf) {
            const newGroups = Array.isArray(data.memberOf) ? data.memberOf : [data.memberOf]
            const s1 = new Set(memberOf || [])
            const s2 = new Set(newGroups || [])
            for (var elem of s2) {
              s1.add(elem)
            }
            attributes.memberOf = [...s1]
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
    if (req.log.isLevelEnabled('debug')) {
      req.log.debug('sending xml: `%s`', Buffer.from(toSendXml, 'utf8').toString('hex'))
    }
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
