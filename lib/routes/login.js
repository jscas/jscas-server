'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const Iron = require('iron')
const uuid = require('uuid')
const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'login'})
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
  log.debug('redirecting with service ticket: %s', stId)
  const _service = service || `${req.server.info.uri}/success`
  log.debug('service = %s', _service)
  if (config.server.use303) {
    const redirectPath = (stId) ? `${_service}?ticket=${stId}` : _service
    return reply().redirect(redirectPath)
      .code(303)
      .state(config.server.tgcName, tgt.tid)
  }
  return reply(
    theme.loginRedirect({
      service: _service,
      ticket: stId
    })
  ).state(config.server.tgcName, tgt.tid)
}

function loginGet (req, reply) {
  log.debug('got /login GET')
  const serviceUrl = getParameter(req, 'service')
  const renew = getParameter(req, 'renew')
  let service

  Promise.coroutine(function * () {
    // validate service
    if (serviceUrl) {
      try {
        service = yield cas.getService(serviceUrl)
      } catch (e) {
        return reply(theme.internalError({ errorMessage: `invalid service: ${serviceUrl}` })).code(400)
      }
    }

    // process pre-existing login or login renewal
    if (req.session.isAuthenticated || renew) {
      try {
        const tgtId = req.state[ config.server.tgcName ]
        const tgt = yield cas.getTicketGrantingTicket(tgtId)
        if (tgt.expired) {
          return reply(theme.unauthorized()).code(403)
        }

        try {
          const serviceTicket = (service && service.name)
            ? yield cas.createServiceTicket(tgt.tid, service.name)
            : null
          return stResolved(serviceUrl, serviceTicket, tgt, req, reply)
        } catch (e) {
          return reply(theme.internalError({errorMessage: e.message})).code(500)
        }
      } catch (e) {
        if (!renew) return reply(theme.unauthorized()).code(403)
      }
    }

    // process new login
    req.session.loginToken = uuid.v4()
    Iron.seal({loginToken: req.session.loginToken}, config.loginCSRF.password, ironOptions, (err, sealed) => {
      if (err) {
        log.error('could not seal login csrf token: %s', err.message)
        log.debug(err.stack)
        return reply(theme.internalError({errorMessage: err.message})).code(500)
      }
      const errorMessage = req.session.errorMessage
      if (errorMessage) delete req.session.errorMessage
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
  log.debug('got /login POST')
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
        return reply(theme.internalError({errorMessage: 'unknown service'})).code(500)
      }
    }

    // validate login token
    try {
      yield validateLoginToken(loginToken, req.session.loginToken)
      delete req.session.loginToken
    } catch (e) {
      log.error('could not find valid login token `%s`: %s', loginToken, e.message)
      log.debug(e.stack)
      req.session.errorMessage = 'invalid login token'
      const serviceParameter = (service && service.url)
        ? `?service=${encodeURIComponent(service.url)}`
        : ''
      return reply().redirect(`/login${serviceParameter}`)
    }

    try {
      for (const plugin of Object.keys((hooks) ? hooks.preAuth : {})) {
        try {
          log.debug('invoking preAuth hook for plugin: %s', plugin)
          const preAuthArgs = {request: req, reply, username, password, cas}
          yield hooks.preAuth[plugin](preAuthArgs)
        } catch (e) {
          log.debug('preAuth hook for plugin "%s" failed: %s', plugin, e.message)
        }
      }

      let authenticated = false
      for (const p of authPlugins) {
        try {
          log.debug('authenticating')
          yield p.validate(username, password)
          log.debug('user authenticated successfully')
          authenticated = true
          break
        } catch (e) {
          log.debug('login credentials rejected')
          log.debug('message: %s', e.message)
        }
      }

      if (!authenticated) {
        const redirectPath = (service.url)
        ? `/login?service=${encodeURIComponent(service.url)}`
        : '/login'
        req.session.errorMessage = 'invalid credentials'
        return reply().redirect(redirectPath)
      }

      const tgt = yield cas.createTicketGrantingTicket(username)
      const st = (service && service.url)
        ? yield cas.createServiceTicket(tgt.tid, service.name)
        : null

      req.session.username = username
      req.session.isAuthenticated = true

      return stResolved(serviceUrl, st, tgt, req, reply)
    } catch (e) {
      log.error('could not process login for `%s`: %s', username, e.message)
      log.debug(e.stack)
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
