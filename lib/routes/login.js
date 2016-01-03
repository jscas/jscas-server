'use strict';

const path = require('path');
const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger');
const config = ioc.get('config');
const authPlugins = ioc.get('plugins').auth;
const theme = ioc.get('plugins').theme;
const ticketRegistry = ioc.get('plugins').ticketRegistry;
const checkService = require(path.join(__dirname, '..', 'checkService'));

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
  const service = req.params.service || req.query.service;
  const renew = req.params.renew || req.query.renew;

  function* handlePrevAuth() {
    let tgt;
    try {
      let tgtId = req.state[config.server.tgcName];
      log.debug('validating tgt: ', tgtId);
      tgt = yield ticketRegistry.getTGT(tgtId);
      if (new Date(tgt.expires) < new Date() && tgt.valid) {
        throw new Error('tgt expired');
      }
      log.debug('tgt is valid');
    } catch (e) {
      log.error('tgt is invalid: %s', tgtId);
      return reply.unauthorized('ticket granting ticket is invalid');
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
      return reply.badImplementation('service ticket generation failed');
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
      return reply.badImplementation('login ticket generation failed');
    }

    return reply(theme.login({
      lt: lt.tid,
      service: service
    }));
  }

  function* renewLogin() {
    log.debug('trying renew login');
    const tgtId = req.state[config.server.tgcName];
    let tgt;
    try {
      tgt = yield ticketRegistry.getTGT(tgtId);
      if (new Date(tgt.expires) < new Date() && tgt.valid) {
        throw new Error('ticket granting ticket expired');
      }
    } catch(e) {
      log.error('could not find tgt: %s', tgtId);
      return ty.spawn(newLogin);
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
      return reply.badImplementation('service ticket generation failed');
    }

    return stResolved(service, st, tgt, req, reply);
  }

  return checkService(service)
    .then(function() {
      if (renew) {
        return ty.spawn(renewLogin);
      }

      if (req.session.isAuthenticated) {
        log.debug(`${req.session.username} already authenticated`);
        return ty.spawn(handlePrevAuth);
      }

      return ty.spawn(newLogin);
    })
    .catch(function() {
      return reply.unauthorized('invalid service url');
    });
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
  const service = decodeURIComponent(req.payload.service || req.query.service);

  // jshint -W071
  function* doLogin() {
    let lt;
    try {
      lt = yield ticketRegistry.getLT(ltId);
      if (new Date(lt.expires) < new Date() && lt.valid) {
        throw new Error('login ticket expired');
      }
      log.debug('login ticket validated');
    } catch (e) {
      log.error('invalid login ticket: %s', ltId);
      return reply().redirect('/login?service=' + encodeURIComponent(service));
    }

    for (let p of authPlugins) {
      try {
        yield p.validate(username, password);
        log.debug('user authenticated successfully');
        break;
      } catch (e) {
        log.error('login credentials rejected');
        return reply().redirect(
          '/login?service=' + encodeURIComponent(service)
        );
      }
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
      return reply.badImplementation('ticket generation failed');
    }

    try {
      lt = yield ticketRegistry.invalidateLT(ltId);
      log.debug('login ticket invalidated: %s', lt.tid);
    } catch (e) {
      log.error('could not invalidate login ticket: %s', ltId);
      return reply.badImplementation('ticket invalidation failed');
    }

    req.session.username = username;
    req.session.isAuthenticated = true;

    return stResolved(service, st, tgt, req, reply);
  }

  checkService(service)
    .then(function() {
      return ty.spawn(doLogin);
    })
    .catch(function(e) {
      return reply.badImplementation(e.message);
    });
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
