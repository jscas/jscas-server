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
  req.log(['debug', 'logout'], `got /logout ${req.method.toUpperCase()}`)
  const tgcName = config.server.tgcName
  const tgtId = req.state[tgcName]

  if (!tgtId) {
    req.log(['debug', 'logout'], 'no tgt id, rendering logout template')
    return reply(theme.logout())
  }

  function * doLogout () {
    let sloServices
    try {
      yield ticketRegistry.invalidateTGT(tgtId)
      sloServices = yield ticketRegistry.servicesLogForTGT(tgtId)
    } catch (e) {
      req.log(['error', 'logout'], `could get logout services for '${tgtId}: ${e.message}`)
      req.log(['debug', 'logout'], e.stack)
    }

    req.log(['debug', 'logout'], `slo services: ${JSON.stringify(sloServices)}`)
    // Implementation more based on https://jasig.github.io/cas/development/installation/Logout-Single-Signout.html
    // than the actual, ambiguous, spec.
    for (const sloService of sloServices) {
      try {
        req.log(['debug', 'logout'], `processing slo for service: ${sloService.serviceId}`)
        const service = yield serviceRegistry.getServiceWithName(sloService.serviceId)
        if (service && service.slo) {
          req.log(['debug', 'logout'], `building slo saml message for service: ${service.name}`)
          const url = (service.sloUrl) ? service.sloUrl : sloService.logoutUrl
          const st = yield ticketRegistry.getSTbyTGT(tgtId)
          const context = {
            sloId: uuid.v4(),
            st: st.tid
          }
          const saml = xml.sloSaml.renderSync(context)
          req.log(['debug', 'logout'], `slo url: ${url}`)
          req.log(['debug', 'logout'], `sending saml: ${saml}`)
          request(
            {url: url, body: saml},
            (err, response, body) => {
              if (err) {
                req.log(['error', 'logout'], `slo for '${service}' failed: ${err.message}`)
                req.log(['debug', 'logout'], err.stack)
                return
              }
              req.log(['debug', 'logout'], `slo for '${service}' returned: ${body}`)
            }
          )
        }
      } catch (e) {
        req.log(['error', 'logout'], `slo failed for service '${sloService.serviceId}': ${e.message}`)
        req.log(['debug', 'logout'], e.stack)
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
