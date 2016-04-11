'use strict';

const path = require('path');
const ty = require('then-yield');
const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger').child({component: 'protocol2'});
const ticketRegistry = ioc.get('plugins').ticketRegistry;
const checkService = require(path.join(__dirname, '..', 'checkService'));
const getParameter = require(path.join(__dirname, '..', 'getParameter'));

const xml = require('../xml');

const errorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TICKET_SPEC: 'INVALID_TICKET_SPEC',
  UNAUTHORIZED_SERVICE_PROXY: 'UNAUTHORIZED_SERVICE_PROXY',
  INVALID_PROXY_CALLBACK: 'INVALID_PROXY_CALLBACK',
  INVALID_TICKET: 'INVALID_TICKET',
  INVALID_SERVICE: 'INVALID_SERVICE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

function serviceValidate(req, reply) {
  log.debug(`got /serviceValidate ${req.method.toUpperCase()}`);
  const service = decodeURIComponent(getParameter(req, 'service'));
  const stId = getParameter(req, 'ticket');

  if (!stId || !service) {
    return reply(xml.invalidST.renderSync({
      code: errorCodes.INVALID_REQUEST,
      message: 'Missing required parameter(s)'
    }));
  }

  const pgtUrl = getParameter(req, 'pgtUrl');
  const renew = getParameter(req, 'renew');
  // const format = req.params.format || req.query.format; // not supported yet
  log.debug('serviceValidate parameters: %j', {service, stId, pgtUrl, renew});

  /* eslint max-statements: "off" */
  /* eslint complexity: "off" */
  function* doValidate() {
    const validService = yield *checkService(service);
    if (!validService) {
      log.error('service not recognized');
      return reply(xml.invalidST.renderSync({
        code: errorCodes.INVALID_SERVICE,
        message: `service ${service} was not recognized`
      }));
    }

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
      return reply(xml.invalidST.renderSync({
        code: errorCodes.INVALID_TICKET,
        message: `ticket ${stId} was not recognized`
      }));
    }

    try {
      st = yield ticketRegistry.invalidateST(stId);
      log.debug('service ticket invalidated: %s', st.tid);
    } catch (e) {
      log.error('could not invalidate service ticket');
      return reply(xml.invalidST.renderSync({
        code: errorCodes.INTERNAL_ERROR,
        message: `service ticket ${stId} could not be invalidated`
      }));
    }

    let tgt;
    try {
      log.debug('getting tgt for st: %s', stId);
      tgt = yield ticketRegistry.getTGTbyST(stId);
    } catch (e) {
      log.error('unable to get tgt for st: %s', stId);
      return reply(xml.invalidST.renderSync({
        code: errorCodes.INVALID_TICKET,
        message: `tgt for ${stId} could not be found`
      }));
    }

    return reply(xml.validST.renderSync({
      username: tgt.userId
    }));
  }

  return ty.spawn(doValidate);
}

const getRoute = {
  path: '/serviceValidate',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  },
  handler: serviceValidate
};

const postRoute = Object.assign({}, getRoute);
postRoute.method = 'POST';

module.exports = [getRoute, postRoute];
