'use strict'

module.exports = function loginRoutePlugin (fastify, options, next) {
  const authenticators = fastify.jscasPlugins.auth
  const casInterface = fastify.jscasInterface
  const tgtCookieName = fastify.jscasTGTCookie
  const theme = fastify.jscasPlugins.theme

  // *** GET ***
  fastify.get('/login', async function loginGetHandler (req, reply) {
    const serviceUrl = req.query.service
    const renew = req.query.renew
    let service

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

    // Proces pre-existing login
    if (req.session.isAuthenticated && !renew) {
      req.log.debug('processing pre-existing authorization')
      try {
        const tgtId = req.cookies[tgtCookieName]
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
          req.log.debug('generated service ticket for service `%s`: %s', service, serviceTicket.tid)
          // TODO: re-add TGT cookie to response and touch session
          return reply.code(303).type('text/html').redirect(
            `${service.url}?ticket=${encodeURIComponent(serviceTicket.tid)}`
          )
        } catch (e) {
          req.log.error('could not create service ticket for service `%s`: %s', service, e.message)
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

    req.session.renewal = renew === 'true' || renew === true
    // We may recieve an error via the session due to a redirect back here
    // after a failed form validation via a POST.
    const lastError = req.session.lastError
    req.session.lastError = undefined
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
    let service

    // Validate the supplied service.
    if (serviceUrl) {
      try {
        service = await casInterface.getService(serviceUrl)
        // TODO: add test coverage for this condition
        if (!service) throw Error('unknown service')
      } catch (e) {
        req.log.error('could not find service `%s`: %s', serviceUrl, e.message)
        req.log.debug(e.stack)
        reply.code(406).type('text/html')
        return theme.unknownService(serviceUrl)
      }
    }

    if (!req.isValidCsrfToken(csrfToken)) {
      req.log.info('received invalid csrf token: %s', csrfToken)

      req.session.lastError = Error('invalid login token')
      return reply
        .code(302)
        .type('text/html')
        .redirect('/login?service=' + encodeURIComponent(serviceUrl))
    }

    try {
      // TODO: determine if preAuth hooks are needed

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
        const redirectPath = service.url
          ? '/login?service=' + encodeURIComponent(service.url)
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
      // TODO: format service url based on presense, e.g. merely logging in, and add test
      return reply
        .setCookie(tgtCookieName, tgt.tid, options.cookie)
        .code(303)
        .type('text/html')
        .redirect(`${service.url}?ticket=${st.tid}`)
    } catch (e) {
      req.log.error('could not process login for `%s`: %s', username, e.message)
      req.log.debug(e.stack)
      reply.code(500).type('text/html')
      return theme.serverError({error: e})
    }
  })

  next()
}
