'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const introduce = require('introduce')(__dirname)
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'protocol1'})
const getParameter = introduce('../getParameter')
const cas = introduce('../casInterface')

function validate (req, reply) {
  log.debug(`got /validate ${req.method.toUpperCase()}`)
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
      log.debug('validating service ticket: %s', stId)
      st = yield cas.getServiceTicket(stId)
      if (st.expired) {
        throw new Error('service ticket expired')
      }
      log.debug('valid service ticket')
    } catch (e) {
      log.error('invalid service ticket')
      return reply('no\n')
    }

    try {
      st = yield cas.invalidateServiceTicket(stId)
      log.debug('service ticket invalidated: %s', st.tid)
    } catch (e) {
      log.error('could not invalidate service ticket')
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
