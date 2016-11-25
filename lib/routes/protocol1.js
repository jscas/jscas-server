'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const introduce = require('introduce')(__dirname)
const getParameter = introduce('../getParameter')
const cas = introduce('../casInterface')

function validate (req, reply) {
  req.log(['debug', 'protocol1'], `got /validate ${req.method.toUpperCase()}`)
  const service = decodeURIComponent(getParameter(req, 'service'))
  const stId = getParameter(req, 'ticket')

  if (!stId || !service) {
    return reply('no\n')
  }

  function * doValidate () {
    const dbService = yield cas.getService(service)
    if (!dbService) {
      return reply('no\n')
    }

    let st
    try {
      req.log(['debug', 'protocol1'], `validating service ticket: ${stId}`)
      st = yield cas.getServiceTicket(stId)
      if (st.expired) {
        throw new Error('service ticket expired')
      }
      req.log(['debug', 'protocol1'], 'valid service ticket')
    } catch (e) {
      req.log(['error', 'protocol1'], 'invalid service ticket')
      return reply('no\n')
    }

    try {
      st = yield cas.invalidateServiceTicket(stId)
      req.log(['debug', 'protocol1'], `service ticket invalidated: ${st.tid}`)
    } catch (e) {
      req.log(['error', 'protocol1'], 'could not invalidate service ticket')
      return reply('no\n')
    }

    return reply('yes\n')
  }

  return Promise.coroutine(doValidate)()
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
}

const postRoute = Object.assign({}, getRoute)
postRoute.method = 'POST'

module.exports = [getRoute, postRoute]
