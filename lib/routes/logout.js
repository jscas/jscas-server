'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const uuid = require('uuid')
const request = require('request')
const ioc = require('laic').laic.casServer
const config = ioc.get('config')
const theme = ioc.get('plugins').theme
const ticketRegistry = ioc.get('plugins').ticketRegistry
const serviceRegistry = ioc.get('plugins').serviceRegistry

const introduce = require('introduce')(__dirname)
const xml = introduce('../xml')

// TODO: support some sort of logout hook

function logout (req, reply) {
  req.logger.debug('got /logout %s', req.method.toUpperCase())
  const tgcName = config.server.tgcName
  const tgtId = req.state[tgcName]

  if (!tgtId) {
    req.logger.debug('no tgt id, rendering logout template')
    return reply(theme.logout())
  }

  function * doLogout () {
    let sloServices
    try {
      yield ticketRegistry.invalidateTGT(tgtId)
      sloServices = yield ticketRegistry.servicesLogForTGT(tgtId)
    } catch (e) {
      req.logger.error('could get logout services for `%s`: %s', tgtId, e.message)
      req.logger.debug(e.stack)
    }

    req.logger.debug('slo services: %j', sloServices)
    // Implementation more based on https://jasig.github.io/cas/development/installation/Logout-Single-Signout.html
    // than the actual, ambiguous, spec.
    for (const sloService of sloServices) {
      try {
        req.logger.debug('processing slo for service: %s', sloService.serviceId)
        const service = yield serviceRegistry.getServiceWithName(sloService.serviceId)
        if (service && service.slo) {
          req.logger.debug('building slo saml message for service: %s', service.name)
          const url = (service.sloUrl) ? service.sloUrl : sloService.logoutUrl
          const st = yield ticketRegistry.getSTbyTGT(tgtId)
          const context = {
            sloId: uuid.v4(),
            st: st.tid
          }
          const saml = xml.sloSaml.renderToString(context)
          req.logger.debug('slo url: %s', url)
          req.logger.debug('sending saml: %s', saml)
          request(
            {url: url, body: saml},
            (err, response, body) => {
              if (err) {
                req.logger.error('slo for `%s` failed: %s', service, err.message)
                req.logger.debug(err.stack)
                return
              }
              req.logger.debug('slo for `%s` returned: %s', service, body)
            }
          )
        }
      } catch (e) {
        req.logger.error('slo failed for service `%s`: %s', sloService.serviceId, e.message)
        req.logger.debug(e.stack)
      }
    }

    req.session.isAuthenticated = false
    return reply(theme.logout()).state(tgcName, null)
  }

  return Promise.coroutine(doLogout)()
}

const getRoute = {
  path: '/logout',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    },
    state: {
      // otherwise an error will be shown if their session has expired
      failAction: 'ignore'
    }
  },
  handler: logout
}

module.exports = [getRoute]
