'use strict'

const path = require('path')
const ty = require('then-yield')
const ioc = require('laic').laic.casServer
const log = ioc.lib.get('logger').child({component: 'protocol1'})
const ticketRegistry = ioc.get('plugins').ticketRegistry
const getService = require(path.join(__dirname, '..', 'getService'))
const getParameter = require(path.join(__dirname, '..', 'getParameter'))

function validate (req, reply) {
  log.debug(`got /validate ${req.method.toUpperCase()}`)
  const service = decodeURIComponent(getParameter(req, 'service'))
  const stId = getParameter(req, 'ticket')

  if (!stId || !service) {
    return reply('no\n')
  }

  function * doValidate () {
    const dbService = yield * getService(service)
    if (!dbService) {
      return reply('no\n')
    }

    let st
    try {
      log.debug('validating service ticket: %s', stId)
      st = yield ticketRegistry.getST(stId)
      if (new Date(st.expires) < new Date()) {
        throw new Error('service ticket expired')
      }
      log.debug('valid service ticket')
    } catch (e) {
      log.error('invalid service ticket')
      return reply('no\n')
    }

    try {
      st = yield ticketRegistry.invalidateST(stId)
      log.debug('service ticket invalidated: %s', st.tid)
    } catch (e) {
      log.error('could not invalidate service ticket')
      return reply('no\n')
    }

    return reply('yes\n')
  }

  return ty.spawn(doValidate)
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
