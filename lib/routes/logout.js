'use strict';

const path = require('path');
const ty = require('then-yield');
const ioc = require('laic').laic.casServer;
const config = ioc.get('config');
const log = ioc.lib.get('logger');
const theme = ioc.get('plugins').theme;
const ticketRegistry = ioc.get('plugins').ticketRegistry;

// TODO: support some sort of logout hook

function logout(req, reply) {
  log.debug(`got /logout ${req.method.toUpperCase()}`);
  const tgcName = config.server.tgcName;
  const tgtId = req.state[tgcName];

  if (!tgtId) {
    return reply(theme.logout());
  }

  function* doLogout() {
    let tgt;
    try {
      tgt = yield ticketRegistry.getTGT(tgtId);
      yield ticketRegistry.clear(tgt);
    } catch (e) {
      log.error('could not do logout for: %s', tgtId);
      return reply(Boom.internal(e.message)).state(tgcName, null);
    }

    req.session.isAuthenticated = false;
    return reply(theme.logout()).state(tgcName, null);
  }

  return ty.spawn(doLogout);
}

const getRoute = {
  path: '/logout',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  },
  handler: logout
};

module.exports = [getRoute];
