'use strict'

const fp = require('fastify-plugin')
const request = require('request')
const rndm = require('rndm')
const xml = require('../xml')

function logoutRoutePlugin (fastify, options, next) {
  const casInterface = fastify.jscasInterface
  const theme = fastify.jscasPlugins.theme
  const tgtCookieName = fastify.jscasTGTCookie
  const ticketRegistry = fastify.jscasPlugins.ticketRegistry

  fastify.get('/logout', async function logoutHandler (req, reply) {
    const tgtId = req.cookies[tgtCookieName]
    const cookieOptions = Object.assign({}, options.cookie, {
      expires: Date.now() + options.cookie.expires
    })
    req.session.isAuthenticated = false
    reply.setCookie(tgtCookieName, null, cookieOptions)

    if (!tgtId) {
      req.log.debug('no tgt id, rendering logout')
      reply.type('text/html')
      return theme.logout()
    }

    try {
      await ticketRegistry.invalidateTGT(tgtId)
    } catch (e) {
      req.log.error('could not invalidate tgt: %s', e.message)
      req.log.debug(e.stack)
    }

    let sloServices = []
    try {
      sloServices = await ticketRegistry.servicesLogForTGT(tgtId)
    } catch (e) {
      req.log.error('could not get slo services: %s', e.message)
      req.log.debug(e.stack)
    }

    req.log.debug('slo services: %j', sloServices)
    for (const sloService of sloServices) {
      const sloId = rndm(16)
      const url = sloService.logoutUrl
      const saml = xml.sloSaml.renderToString({
        sloId,
        stId: sloService.serviceTicketId
      })
      req.log.debug('slo url: %s', url)
      req.log.debug('sending saml: %s', saml)
      request(
        {url, body: saml, method: 'POST'},
        (err, response, body) => {
          if (err) {
            req.log.error('slo for `%s` failed: %s', url, err.message)
            req.log.debug(err.stack)
            return
          }
          req.log.debug('slow for `%s` returned: %s', url, body)
        }
      )
    }

    const serviceUrl = req.query.service
    if (serviceUrl) {
      try {
        const service = await casInterface.getService(serviceUrl)
        if (service && service.url === serviceUrl) {
          return reply.redirect(303, serviceUrl)
        }
      } catch (e) {
        req.log.error('could not validate service url: %s', e.message)
        req.log.debug(e.stack)
      }
    }

    reply.type('text/html')
    return theme.logout()
  })

  next()
}

module.exports = fp(logoutRoutePlugin)
