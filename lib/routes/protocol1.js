'use strict';

const path = require('path');
const ty = require('then-yield');
const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger');
const ticketRegistry = ioc.get('plugins').ticketRegistry;
const checkService = require(path.join(__dirname, '..', 'checkService'));

function validate(req, reply) {
  log.debug(`got /validate ${req.method.toUpperCase()}`);
  const service = decodeURIComponent(req.params.service || req.query.service);
  const stId = req.params.ticket || req.query.ticket;

  if (!stId || !service) {
    return reply('no\n');
  }

  function* doValidate() {
    let st;
    try {
      log.debug('validating service ticket: %s', stId);
      st = yield ticketRegistry.getST(stId);
      if (new Date(st.expires) < new Date() && st.valid) {
        throw new Error('service ticket expired');
      }
      log.debug('valid service ticket');
    } catch (e) {
      log.error('invalid service ticket');
      return reply('no\n');
    }

    try {
      st = yield ticketRegistry.invalidateST(stId);
      log.debug('service ticket invalidated: %s', st.tid);
    } catch (e) {
      log.error('could not invalidate service ticket');
      return reply('no\n');
    }

    return reply('yes\n');
  }

  return checkService(service)
    .then(function() {
      return ty.spawn(doValidate);
    })
    .catch(function() {
      return reply.unauthorized('invalid service url');
    });
}

const getRoute = {
  path: '/validate',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  },
  handler: validate
};

const postRoute = Object.assign({}, getRoute);
postRoute.method = 'POST';

module.exports = [getRoute, postRoute];
