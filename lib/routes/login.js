'use strict'

module.exports = function loginRoutePlugin (fastify, options, next) {
  const authenticators = fastify.jscasPlugins.auth
  const casInterface = fastify.jscasInterface
  const tgtCookieName = fastify.jscasTGTCookie
  const theme = fastify.jscasPlugins.theme
  const preAuthHooks = fastify.jscasHooks.preAuth

  // *** GET ***
  fastify.get('/login', async function loginGetHandler (req, reply) {
    const serviceUrl = req.query.service || req.query.TARGET
    const renew = req.query.renew && (req.query.renew === 'true' || req.query.renew === true)
    let service

    if (req.query && 'TARGET' in req.query) {
      req.session.samlConversation = true
    }

    // Validate the supplied service.
    if (serviceUrl) {
      try {
        service = await casInterface.getService(serviceUrl)
      } catch (e) {
        req.log.error('could not validate service `%s`: %s', serviceUrl, e.message)
        req.log.debug(e.stack)
        reply.code(400).type('text/html')
        return theme.unknownService(serviceUrl)
      }
    }

    // Process pre-existing login
    if (req.session.isAuthenticated && !renew) {
      req.log.debug('processing pre-existing authorization')
      try {
        const tgtId = req.cookies[tgtCookieName]
        if (!tgtId) throw Error('could not find ticket granting ticket')
        const tgt = await casInterface.getTicketGrantingTicket(tgtId)
        if (tgt.expired) {
          req.log.debug('tgt expired')
          const error = Error('session has expired')
          req.session.isAuthenticated = false
          reply.code(403).type('text/html')
          return theme.login({error, service: serviceUrl, csrfToken: req.session.csrfToken})
        }

        try {
          const serviceTicket = (service && service.name)
            ? await casInterface.createServiceTicket(tgt.tid, service.name)
            : null
          req.log.debug('generated service ticket for service `%s`: %s', service.name, serviceTicket.tid)
          const cookieOptions = Object.assign({}, options.cookie, {
            expires: Date.now() + options.cookie.expires
          })
          reply.setCookie(tgtCookieName, tgtId, cookieOptions)
          req.session.touched = Date.now()
          const TICKET_PARAM = (req.query.TARGET) ? 'SAMLart' : 'ticket'
          return reply.code(303).type('text/html').redirect(
            `${service.url}?${TICKET_PARAM}=${encodeURIComponent(serviceTicket.tid)}`
          )
        } catch (e) {
          req.log.error('could not create service ticket for service `%s`: %s', service.name, e.message)
          req.log.debug(e.stack)
          const error = Error('could not generate service ticket')
          reply.code(500).type('text/html')
          return theme.serverError({error})
        }
      } catch (e) {
        req.log.error('error validating pre-existing authorization: %s', e.message)
        req.log.debug(e.stack)
        if (!renew) {
          reply.code(403).type('text/html')
          return theme.unauthorized()
        }
      }
    }

    req.session.renewal = renew
    // We may recieve an error via the session due to a redirect back here
    // after a failed form validation via a POST.
    const lastError = req.session.lastError
    req.session.lastError = undefined
    req.log.debug('sending login form to user')
    reply.type('text/html')
    return theme.login({
      service: serviceUrl,
      csrfToken: req.session.csrfToken,
      error: lastError
    })
  })

  // *** POST ***
  fastify.post('/login', async function loginPostHandler (req, reply) {
    const username = req.body.username
    const password = req.body.password
    const csrfToken = req.body.csrfToken
    const serviceUrl = req.body.service
    const isSamlConversation = req.session.samlConversation
    const SERVICE_PARAM = isSamlConversation ? 'TARGET' : 'service'
    const TICKET_PARAM = isSamlConversation ? 'SAMLart' : 'ticket'
    let service

    // Validate the supplied service.
    if (serviceUrl) {
      try {
        service = await casInterface.getService(serviceUrl)
        if (!service) throw Error('unknown service')
      } catch (e) {
        req.log.error('could not find service `%s`: %s', serviceUrl, e.message)
        req.log.debug(e.stack)
        reply.code(406).type('text/html')
        return theme.unknownService(serviceUrl)
      }
    }

    const serviceUrlComponent = (serviceUrl)
      ? `${SERVICE_PARAM}=${encodeURIComponent(serviceUrl)}`
      : undefined
    if (!req.isValidCsrfToken(csrfToken)) {
      req.log.info('received invalid csrf token: %s', csrfToken)

      req.session.lastError = Error('invalid login token')
      const redirectPath = (serviceUrlComponent)
        ? `/login?${serviceUrlComponent}`
        : '/login'
      return reply
        .code(302)
        .type('text/html')
        .redirect(redirectPath)
    }

    try {
      if (!req.session.hooks) req.session.hooks = {}
      for (const hook of preAuthHooks) {
        try {
          const hookSession = req.session.hooks[Symbol.for('jscas-hook-id')] || {}
          await hook({username, password, serviceUrl, session: hookSession})
        } catch (e) {
          req.log.error('preAuth hook failed: %s', e.message)
          req.log.debug(e.stack)
        }
      }

      let authenticated = false
      req.log.debug('number of available authenticators: %s', authenticators.length)
      for (const authenticator of authenticators) {
        try {
          req.log.debug('authenticating')
          const result = await authenticator.validate(username, password)
          if (result) {
            req.log.debug('user authenticated successfully')
            authenticated = true
            break
          }
        } catch (e) {
          req.log.debug('login credentials rejected because of promise rejection')
          req.log.error('credential validation failed: %s', e.message)
          req.log.debug(e.stack)
        }
      }

      if (!authenticated) {
        const redirectPath = (serviceUrlComponent)
          ? `/login?${serviceUrlComponent}`
          : '/login'
        req.session.lastError = Error('invalid credentials')
        req.log.debug('authentication failed, redirecting to %s', redirectPath)
        return reply.code(302).type('text/html').redirect(redirectPath)
      }

      const tgt = req.session.renewal
        ? await casInterface.getTicketGrantingTicket(req.cookies[tgtCookieName])
        : await casInterface.createTicketGrantingTicket(username)
      const st = service && service.url
        ? await casInterface.createServiceTicket(tgt.tid, service.name)
        : null

      req.session.username = username
      req.session.isAuthenticated = true
      const cookieOptions = Object.assign({}, options.cookie, {
        expires: Date.now() + options.cookie.expires
      })
      const redirectPath = (serviceUrl)
        ? `${serviceUrl}?${TICKET_PARAM}=${st.tid}`
        : '/success'
      req.log.debug('redirecting user to: %s', redirectPath)
      return reply
        .setCookie(tgtCookieName, tgt.tid, cookieOptions)
        .code(303)
        .type('text/html')
        .redirect(redirectPath)
    } catch (e) {
      req.log.error('could not process login for `%s`: %s', username, e.message)
      req.log.debug(e.stack)
      reply.code(500).type('text/html')
      return theme.serverError({error: e})
    }
  })

  next()
}
