'use strict';

const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger').child({component: 'LoginGet'});
const config = ioc.get('config');
const theme = ioc.get('plugins').theme;
const ticketRegistry = ioc.get('plugins').ticketRegistry;

/**
 * Provides methods needed for parsing a `/login` GET request.
 * 
 * @private
 * @param request
 * @param reply
 * @constructor
 */
function LoginGet(request, reply) {
  this.request = request;
  this.reply = reply;
}

LoginGet.prototype.genLT = function* genLT() {
  log.debug('generating lt');
  let ticket;
  try {
    ticket = yield ticketRegistry.genLT(
      new Date(Date.now() + config.tickets.loginTicketTTL)
    );
    log.debug('got lt: %s', ticket.tid);
  } catch (e) {
    log.error('could not create login ticket');
    return this.reply(theme.internalError({
      errorMessage: 'login ticket generation failed'
    })).code(500);
  }
  return ticket;
};

LoginGet.prototype.genST = function* genST(tgtId) {
  log.debug('generating st for tgt: %s', tgtId);
  let ticket;
  try {
    ticket = yield ticketRegistry.genST(
      tgtId,
      new Date(Date.now() + config.tickets.serviceTicketTTL)
    );
    log.debug('got st with id: %s', ticket.tid);
  } catch (e) {
    log.error('could not generate st for tgt: %s', tgtId);
    return this.reply(theme.internalError({
      errorMessage: 'service ticket generation failed'
    })).code(500);
  }
  return ticket;
};

/* eslint max-statements: "off" */
LoginGet.prototype.getTGT = function* getTGT() {
  log.debug('looking for tgt');
  const tgtId = this.request.state[config.server.tgcName];
  let ticket;
  try {
    ticket = yield ticketRegistry.getTGT(tgtId);
    if (new Date(ticket.expires) < new Date()) {
      log.error('ticket granting ticket expired');
      ticket.expired = true;
    }
  } catch (e) {
    log.error('could not find tgt: %s', tgtId);
    return null;
  }
  return ticket;
};

module.exports = LoginGet;
