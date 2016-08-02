'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const path = require('path')
const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'login'})
const config = ioc.get('config')
const theme = ioc.get('plugins').theme
const authPlugins = ioc.get('plugins').auth
const hooks = ioc.get('hooks')
const getParameter = introduce('../getParameter')
const cas = introduce('../casInterface')

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
    try {
      service = yield cas.getService(serviceUrl)
    } catch (e) {
      return reply(theme.internalError({errorMessage: `invalid service: ${serviceUrl}`})).code(400)
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
          const serviceTicket = yield cas.createServiceTicket(tgt.tid, service.name)
          return stResolved(serviceUrl, serviceTicket, tgt, req, reply)
        } catch (e) {
          return reply(theme.internalError({errorMessage: e.message})).code(500)
        }
      } catch (e) {
        if (!renew) return reply(theme.unauthorized()).code(403)
      }
    }

    // process new login
    try {
      const loginTicket = yield cas.createLoginTicket()
      const errorMessage = req.session.errorMessage
      if (errorMessage) delete req.session.errorMessage
      return reply(theme.login({
        lt: loginTicket.tid,
        service: serviceUrl,
        errorMessage
      }))
    } catch (e) {
      return reply(theme.internalError({errorMessage: 'could not generate login ticket'})).code(500)
    }
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

function loginPost (req, reply) {
  log.debug('got /login POST')
  const username = req.payload.username
  const password = req.payload.password
  const ltId = req.payload.lt
  let serviceUrl = getParameter(req, 'service')
  serviceUrl = (serviceUrl) ? decodeURIComponent(serviceUrl) : serviceUrl

  Promise.coroutine(function * () {
    let service = {name: null}
    if (serviceUrl) {
      try {
        service = yield cas.getService(serviceUrl)
      } catch (e) {
        return reply(theme.internalError({errorMessage: 'unknown service'})).code(500)
      }
    }

    // validate login ticket
    let loginTicket
    try {
      loginTicket = yield cas.getLoginTicket(ltId)
    } catch (e) {
      log.error('could not find login ticket `%s`: %s', ltId, e.message)
      log.debug(e.stack)
      req.session.errorMessage = 'invalid login ticket'
      return reply().redirect(`/login?service=${encodeURIComponent(service.url)}`)
    }

    try {
      for (const plugin of Object.keys((hooks) ? hooks.preAuth : {})) {
        try {
          log.debug('invoking preAuth hook for plugin: %s', plugin)
          yield hooks.preAuth[plugin](req, reply, username, password, loginTicket)
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

      const tgt = yield cas.createTicketGrantingTicket(loginTicket.tid, username)
      const st = yield cas.createServiceTicket(tgt.tid, service.name)
      yield cas.invalidateLoginTicket(loginTicket.tid)

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
