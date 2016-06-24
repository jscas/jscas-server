'use strict'

const path = require('path')
const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'login'})
const config = ioc.get('config')
const theme = ioc.get('plugins').theme
const getParameter = require(path.join(__dirname, '..', 'getParameter'))

const LoginGet = introduce('objects', 'LoginGet')
const LoginPost = introduce('objects', 'LoginPost')

const ty = require('then-yield')

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
  const lg = new LoginGet(req, reply)
  let service

  function * handlePrevAuth () {
    const tgt = yield * lg.getTGT()
    if (!tgt || tgt.expired) {
      return reply(theme.unauthorized()).code(403)
    }
    const st = yield * lg.genST(tgt.tid, service.name)

    return stResolved(serviceUrl, st, tgt, req, reply)
  }

  function * newLogin () {
    const lt = yield * lg.genLT()
    const errorMessage = req.session.errorMessage
    if (errorMessage) {
      delete req.session.errorMessage
    }
    return reply(theme.login({
      lt: lt.tid,
      service: serviceUrl,
      errorMessage: errorMessage
    }))
  }

  function * renewLogin () {
    log.debug('trying renew login')
    const tgt = yield * lg.getTGT()
    if (!tgt || tgt.expired) {
      return yield * newLogin()
    }
    const st = yield * lg.genST(tgt.tid, service.name)

    return stResolved(serviceUrl, st, tgt, req, reply)
  }

  function * handleRequest () {
    try {
      log.debug('looking up service by url: %s', serviceUrl)
      service = yield * lg.getService(serviceUrl)
      log.debug('found service (null is for authentication only)')
    } catch (e) {
      log.debug('error finding service: %s', e.message)
      throw e
    }

    if (renew) {
      return yield * renewLogin()
    }

    if (req.session.isAuthenticated) {
      log.debug(`${req.session.username} already authenticated`)
      return yield * handlePrevAuth()
    }

    return yield * newLogin()
  }

  ty.spawn(handleRequest)
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

  function * doLogin () {
    const lp = new LoginPost(req, reply)
    let service
    if (serviceUrl) {
      service = yield * lp.getService(serviceUrl)
      if (!service) {
        return reply(theme.internalError({
          errorMessage: 'unknown service'
        })).code(500)
      }
    }

    const loginTicket = yield * lp.loginTicket(ltId)
    yield * lp.preAuthHooks(req, reply, username, password, loginTicket)
    const authenticated = yield * lp.authenticate(username, password)
    if (!authenticated) {
      req.session.errorMessage = 'invalid credentials'
      return reply().redirect(lp.redirectPath())
    }

    const tgt = yield * lp.ticketGrantingTicket(loginTicket, username)
    const st = yield * lp.serviceTicket(tgt, service.name)
    yield * lp.invalidateLoginTicket(ltId)

    req.session.username = username
    req.session.isAuthenticated = true

    return stResolved(serviceUrl, st, tgt, req, reply)
  }

  ty.spawn(doLogin)
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
