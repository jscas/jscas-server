'use strict'

// This an implementation of the functionality described in
// https://github.com/apereo/cas/blob/92ea88/docs/cas-server-documentation/protocol/SAML-Protocol.md
//
// Such functionality is not really a part of the CAS protocol, but it is
// assumed present by some service providers (e.g. version 9 of a major Student
// Information System product).

// EXPERIMENTAL: this feature is considered experimental.

const crypto = require('crypto')
const conflate = require('conflate')
const xml = require('../../xml')
const xmlContentParser = require('./contentTypeParser')

function samlValidateRoutePlugin (fastify, options, next) {
  const sessionMaxAge = options.sessionMaxAge

  async function samlValidate (req, reply) {
    const serviceUrl = req.query.service
    const serviceTicketId = req.body.ticket

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
      req.log.error('unalbe to get tgt for service: %s', serviceTicketId)
      req.log.debug(tgt.stack)
      reply.type('text/xml')
      return xml.invalidST.renderToString({
        code: tgt.code,
        message: `TGT for ${serviceTicketId} could not be found`
      })
    }

    await fastify.trackService(serviceTicket, tgt, serviceUrl)

    let attributes
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

    const toSendXml = xml.saml11Success.renderToString({
      username: tgt.userId,
      requestId: req.body.id,
      responseId: crypto.randomBytes(16).toString('hex'),
      assertionId: crypto.randomBytes(16).toString('hex'),
      issued: (new Date()).toUTCString(),
      expires: (new Date(Date.now() + sessionMaxAge)).toUTCString(),
      serviceUrl,
      attributes
    })
    if (req.log.isLevelEnabled('debug')) {
      req.log.debug('sending xml: `%s`', Buffer.from(toSendXml, 'utf8').toString('hex'))
    }
    reply.type('text/xml')
    return toSendXml
  }

  fastify.post('/samlValidate', samlValidate)
  fastify.addContentTypeParser('application/xml', {parseAs: 'string'}, xmlContentParser)
  fastify.addContentTypeParser('text/xml', {parseAs: 'string'}, xmlContentParser)

  next()
}

// Do not export with `fastify-plugin` so that the content type parsers
// will only apply to this route.
module.exports = samlValidateRoutePlugin
