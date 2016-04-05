'use strict';

const path = require('path');
const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger');
const config = ioc.get('config');
const authPlugins = ioc.get('plugins').auth;
const theme = ioc.get('plugins').theme;
const ticketRegistry = ioc.get('plugins').ticketRegistry;
const checkService = require(path.join(__dirname, '..', 'checkService'));
const getParameter = require(path.join(__dirname, '..', 'getParameter'));

const ty = require('then-yield');

function stResolved(service, st, tgt, req, reply) {
  log.debug('redirecting with service ticket: %s', st.tid);
  const _service = (service !== 'undefined') ?
    service : `${req.server.info.uri}/success`;
  log.debug('service = %s', _service);
  if (config.server.use303) {
    return reply().redirect(`${_service}?ticket=${st.tid}`)
      .code(303)
      .state(config.server.tgcName, tgt.tid);
  } else {
    return reply(
      theme.loginRedirect({
        service: _service,
        ticket: st.tid
      })
    ).state(config.server.tgcName, tgt.tid);
  }
}

function loginGet(req, reply) {
  log.debug('got /login GET');
  const service = getParameter(req, 'service');
  const renew = getParameter(req, 'renew');

  function* handlePrevAuth() {
    let tgt;
    let tgtId;
    try {
      tgtId = req.state[config.server.tgcName];
      log.debug('validating tgt: ', tgtId);
      tgt = yield ticketRegistry.getTGT(tgtId);
      if (new Date(tgt.expires) < new Date()) {
        throw new Error('tgt expired');
      }
      log.debug('tgt is valid');
    } catch (e) {
      log.error('tgt is invalid: %s', tgtId);
      return reply(theme.unauthorized()).code(403)
    }

    let st;
    try {
      st = yield ticketRegistry.genST(
        tgt.tid,
        new Date(Date.now() + config.tickets.serviceTicketTTL)
      );
      log.debug('got st with id: ', st.tid);
    } catch (e) {
      log.error('could not generate st');
      return reply(theme.internalError({
        errorMessage: 'service ticket generation failed'
      })).code(500);
    }

    return stResolved(service, st, tgt, req, reply);
  }

  function* newLogin() {
    let lt;
    try {
      lt = yield ticketRegistry.genLT(
        new Date(Date.now() + config.tickets.loginTicketTTL)
      );
      log.debug('got lt: ', lt.tid);
    } catch(e) {
      log.error('could not create login ticket');
      return reply(
        theme.internalError({errorMessage: 'login ticket generation failed'
      })).code(500);
    }

    const errorMessage = req.session.errorMessage;
    if (errorMessage) {
      delete req.session.errorMessage;
    }
    return reply(theme.login({
      lt: lt.tid,
      service: service,
      errorMessage: errorMessage
    }));
  }

  function* renewLogin() {
    log.debug('trying renew login');
    const tgtId = req.state[config.server.tgcName];
    let tgt;
    try {
      tgt = yield ticketRegistry.getTGT(tgtId);
      if (new Date(tgt.expires) < new Date()) {
        throw new Error('ticket granting ticket expired');
      }
    } catch(e) {
      log.error('could not find tgt: %s', tgtId);
      return yield* newLogin();
    }

    let st;
    try {
      st = yield ticketRegistry.genST(
        tgtId,
        new Date(Date.now() + config.tickets.serviceTicketTTL)
      );
      log.debug('got st with id: %s', st.tid);
    } catch(e) {
      log.error('could not generate st for tgt: %s', tgtId);
      return reply(theme.internalError({
          errorMessage: 'service ticket generation failed'
        })).code(500);
    }

    return stResolved(service, st, tgt, req, reply);
  }

  function* handleRequest() {
    const validService = yield* checkService(service);
    if (!validService) {
      return reply(theme.internalError({errorMessage: 'invalid service'})).code(500);
    }

    if (renew) {
      return yield* renewLogin();
    }

    if (req.session.isAuthenticated) {
      log.debug(`${req.session.username} already authenticated`);
      return yield* handlePrevAuth();
    }

    return yield* newLogin();
  }

  ty.spawn(handleRequest);
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
};

function loginPost(req, reply) {
  log.debug('got /login POST');
  const username = req.payload.username;
  const password = req.payload.password;
  const ltId = req.payload.lt;
  const service = decodeURIComponent(getParameter(req, 'service'));

  // jshint -W071
  function* doLogin() {
    let lt;
    try {
      lt = yield ticketRegistry.getLT(ltId);
      if (new Date(lt.expires) < new Date()) {
        throw new Error('login ticket expired');
      }
      log.debug('login ticket validated');
    } catch (e) {
      log.error('invalid login ticket: %s', ltId);
      req.session.errorMessage = 'invalid login ticket';
      return reply().redirect('/login?service=' + encodeURIComponent(service));
    }

    let authed = false;
    for (let p of authPlugins) {
      try {
        log.debug('authenticating');
        yield p.validate(username, password);
        log.debug('user authenticated successfully');
        authed = true;
        break;
      } catch (e) {
        log.error('login credentials rejected');
        log.debug('message: %s', e.message);
      }
    }
    if (!authed) {
      req.session.errorMessage = 'invalid credentials';
      return reply().redirect('/login?service=' + encodeURIComponent(service));
    }

    let tgt;
    let st;
    try {
      tgt = yield ticketRegistry.genTGT(
        lt.tid,
        username,
        new Date(Date.now() + config.tickets.ticketGrantingTicketTTL)
      );
      log.debug('got tgt with id: ', tgt.tid);
      st = yield ticketRegistry.genST(
        tgt.tid,
        new Date(Date.now() + config.tickets.serviceTicketTTL)
      );
      log.debug('got st with id: ', st.tid);
    } catch (e) {
      log.error('could not generate tgt and/or st');
      return reply(theme.internalError({
        errorMessage: 'ticket generation failed'
      })).code(500);
    }

    try {
      lt = yield ticketRegistry.invalidateLT(ltId);
      log.debug('login ticket invalidated: %s', lt.tid);
    } catch (e) {
      log.error('could not invalidate login ticket: %s', ltId);
      return reply(theme.internalError({
        errorMessage: 'ticket invalidation failed'
      })).code(500);
    }

    req.session.username = username;
    req.session.isAuthenticated = true;

    return stResolved(service, st, tgt, req, reply);
  }

  function* handleRequest() {
    const validService = yield* checkService(service);
    if (!validService) {
      return reply(theme.internalError({
        errorMessage: 'unknown service'
      })).code(500);
    }

    return yield* doLogin();
  }

  ty.spawn(handleRequest);
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
};

module.exports = [loginGetRoute, loginPostRoute];
