'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const Iron = require('iron')
const uuid = require('uuid')
const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const theme = ioc.get('plugins').theme
const authPlugins = ioc.get('plugins').auth
const hooks = ioc.get('hooks')
const getParameter = introduce('../getParameter')
const cas = introduce('../casInterface')

const ironOptions = Iron.defaults
ironOptions.ttl = config.loginCSRF.ttl

function stResolved (service, st, tgt, req, reply) {
  const stId = (st && st.tid) ? st.tid : null
  req.logger.debug('redirecting with service ticket: %s', stId)
  const _service = service || `${req.server.info.uri}/success`
  req.logger.debug('service: %s', _service)
  if (config.server.use303) {
    const redirectPath = (stId) ? `${_service}?ticket=${stId}` : _service
    req.logger.debug('sending 303 redirect to `%s`', redirectPath)
    return reply().redirect(redirectPath)
      .code(303)
      .state(config.server.tgcName, tgt.tid)
  }
  req.logger.debug('using intermediary redirect for service: %s', _service)
  return reply(
    theme.loginRedirect({
      service: _service,
      ticket: stId
    })
  ).state(config.server.tgcName, tgt.tid)
}

function loginGet (req, reply) {
  req.logger.debug('got /login GET')
  const serviceUrl = getParameter(req, 'service')
  const renew = getParameter(req, 'renew')
  let service

  Promise.coroutine(function * () {
    // validate service
    if (serviceUrl) {
      try {
        service = yield cas.getService(serviceUrl)
      } catch (e) {
        req.logger.error('could not validate service `%s`: %s', serviceUrl, e.message)
        req.logger.debug(e.stack)
        return reply(theme.internalError({ errorMessage: `invalid service: ${serviceUrl}` })).code(400)
      }
    }

    // process pre-existing login
    if (req.session.isAuthenticated && !renew) {
      req.logger.debug('processing pre-existing authorization')
      try {
        const tgtId = req.state[ config.server.tgcName ]
        const tgt = yield cas.getTicketGrantingTicket(tgtId)
        if (tgt.expired) {
          req.logger.debug('tgt expired')
          return reply(theme.unauthorized()).code(403)
        }

        try {
          const serviceTicket = (service && service.name)
            ? yield cas.createServiceTicket(tgt.tid, service.name)
            : null
          req.logger.debug('generated service ticket for service `%s`: %s', service, serviceTicket.tid)
          return stResolved(serviceUrl, serviceTicket, tgt, req, reply)
        } catch (e) {
          req.logger.error('could not create service ticket for service `%s`: %s', service, e.message)
          req.logger.debug(e.stack)
          return reply(theme.internalError({errorMessage: e.message})).code(500)
        }
      } catch (e) {
        req.logger.error('error validating authorization: %s', e.message)
        req.logger.debug(e.stack)
        if (!renew) return reply(theme.unauthorized()).code(403)
      }
    }

    // process new login or renewal
    req.session.loginToken = uuid.v4()
    // `renew` would be the string 'true' or some other string. We want a primiteve bool.
    // eslint-disable-next-line no-unneeded-ternary
    req.session.renewal = renew ? true : false
    Iron.seal({loginToken: req.session.loginToken}, config.loginCSRF.password, ironOptions, (err, sealed) => {
      if (err) {
        req.logger.error('could not seal login csrf token: %s', err.message)
        req.logger.debug(err.stack)
        return reply(theme.internalError({errorMessage: err.message})).code(500)
      }
      const errorMessage = req.session.errorMessage
      if (errorMessage) req.session.errorMessage = undefined
      return reply(theme.login({errorMessage, loginToken: sealed, service: serviceUrl}))
    })
  })()
}

const loginGetRoute = {
  path: '/login',
  method: 'GET',
  handler: loginGet,
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    },
    state: {
      failAction: 'ignore'
    }
  }
}

function validateLoginToken (sealed, original) {
  return new Promise((resolve, reject) => {
    Iron.unseal(sealed, config.loginCSRF.password, ironOptions, (err, unsealed) => {
      if (err) {
        return reject(err)
      }
      if (original !== unsealed.loginToken) {
        const msg = `csrf tokens do not match: ${original} != ${unsealed.loginToken}`
        return reject(new Error(msg))
      }
      return resolve()
    })
  })
}

function loginPost (req, reply) {
  req.logger.debug('got /login POST')
  const username = req.payload.username
  const password = req.payload.password
  const loginToken = req.payload.loginToken
  let serviceUrl = getParameter(req, 'service')
  serviceUrl = (serviceUrl) ? decodeURIComponent(serviceUrl) : null

  Promise.coroutine(function * () {
    let service = {name: null}
    if (serviceUrl) {
      try {
        service = yield cas.getService(serviceUrl)
      } catch (e) {
        req.logger.error('could not find service `%s`: %s', serviceUrl, e.message)
        req.logger.debug(e.stack)
        return reply(theme.internalError({errorMessage: 'unknown service'})).code(500)
      }
    }

    // validate login token
    try {
      yield validateLoginToken(loginToken, req.session.loginToken)
      req.session.loginToken = undefined
    } catch (e) {
      req.logger.error('could not find valid login token `%s`: %s', loginToken, e.message)
      req.logger.debug(e.stack)
      req.session.errorMessage = 'invalid login token'
      const serviceParameter = (service && service.url)
        ? `?service=${encodeURIComponent(service.url)}`
        : ''
      return reply().redirect(`/login${serviceParameter}`)
    }

    try {
      for (const plugin of Object.keys((hooks) ? hooks.preAuth : {})) {
        try {
          req.logger.debug('invoking preAuth hook for plugin: %s', plugin)
          const preAuthArgs = {request: req, reply, username, password, cas}
          yield hooks.preAuth[plugin](preAuthArgs)
        } catch (e) {
          req.logger.error('preAuth hook for plugin `%s` failed: %s', plugin, e.message)
          req.logger.debug(e.stack)
        }
      }

      let authenticated = false
      for (const p of authPlugins) {
        try {
          req.logger.debug('authenticating')
          const result = yield p.validate(username, password)
          if (result) {
            req.logger.debug('user authenticated successfully')
            authenticated = true
            break
          }
          req.logger.debug('login credentials rejected because of false result')
        } catch (e) {
          req.logger.debug('login credentials rejected because of promise rejection')
          req.logger.error('message: %s', e.message)
          req.logger.debug(e.stack)
        }
      }

      if (!authenticated) {
        const redirectPath = (service.url)
        ? `/login?service=${encodeURIComponent(service.url)}`
        : '/login'
        req.session.errorMessage = 'invalid credentials'
        req.logger.debug('authentication failed, redirecting to %s', redirectPath)
        return reply().redirect(redirectPath)
      }

      const tgt = (req.session.renewal)
        ? yield cas.getTicketGrantingTicket(req.state[config.server.tgcName])
        : yield cas.createTicketGrantingTicket(username)
      const st = (service && service.url)
        ? yield cas.createServiceTicket(tgt.tid, service.name)
        : null

      req.session.username = username
      req.session.isAuthenticated = true

      return stResolved(serviceUrl, st, tgt, req, reply)
    } catch (e) {
      req.logger.error('could not process login for `%s`: %s', username, e.message)
      req.logger.debug(e.stack)
      return reply(theme.internalError({errorMessage: e.message})).code(500)
    }
  })()
}

const loginPostRoute = {
  path: '/login',
  method: 'POST',
  handler: loginPost,
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  }
}

module.exports = [loginGetRoute, loginPostRoute]
