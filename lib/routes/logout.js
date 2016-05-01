'use strict';

const ty = require('then-yield');
const uuid = require('uuid');
const request = require('request');
const ioc = require('laic').laic.casServer;
const config = ioc.get('config');
const log = ioc.lib.get('logger').child({component: 'logout'});
const theme = ioc.get('plugins').theme;
const ticketRegistry = ioc.get('plugins').ticketRegistry;
const serviceRegistry = ioc.get('plugins').serviceRegistry;

const introduce = require('introduce')(__dirname);
const xml = introduce('../xml');

// TODO: support some sort of logout hook

function logout(req, reply) {
  log.debug(`got /logout ${req.method.toUpperCase()}`);
  const tgcName = config.server.tgcName;
  const tgtId = req.state[tgcName];

  if (!tgtId) {
    return reply(theme.logout());
  }

  function* doLogout() {
    let sloServices;
    try {
      yield ticketRegistry.invalidateTGT(tgtId);
      sloServices = yield ticketRegistry.servicesLogForTGT(tgtId);
    } catch (e) {
      log.error('could get logout services for: %s', tgtId);
    }

    log.debug('slo services: %j', sloServices);
    // Implementation more based on https://jasig.github.io/cas/development/installation/Logout-Single-Signout.html
    // than the actual, ambiguous, spec.
    for (const sloService of sloServices) {
      try {
        log.debug('processing slo for service: %s', sloService.serviceId);
        const service = yield serviceRegistry.getServiceWithName(sloService.serviceId);
        if (service && service.slo) {
          log.debug('building slo saml message for service: %s', service.name);
          const url = (service.sloUrl) ? service.sloUrl : sloService.logoutUrl;
          const st = yield ticketRegistry.getSTbyTGT(tgtId);
          const context = {
            sloId: uuid.v4(),
            st: st.tid
          };
          const saml = xml.sloSaml.renderSync(context);
          log.debug('slo url: %s', url);
          log.debug('sending saml: %s', saml);
          request(
            {
              url: url,
              body: saml
            },
            (err, response, body) => {
              if (err) {
                log.debug('slo for "%s" failed: %s', err.message);
                return;
              }
              log.debug('slo for "%s" returned: %s', body);
            }
          );
        }
      } catch (e) {
        log.error('slo failed for service: %s', sloService.serviceId);
      }
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
