'use strict'

const tap = require('tap')
const test = tap.test
const clone = require('clone')
const mockquire = require('mock-require')
const nullLogger = require('../../nullLogger')
const casFactory = require('../../../lib/casInterface')

const contextProto = {
  serviceRegistry: {},
  ticketRegistry: {}
}

mockquire('../../../lib/config', {
  get (path) {
    return 100
  }
})
mockquire('../../../lib/logger', () => nullLogger)

tap.tearDown(() => {
  mockquire.stopAll()
})

test('updates a tgt correctly', async (t) => {
  t.plan(5)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function (tid) {
      t.is(tid, 'valid-st')
      return {tid, expires: new Date(Date.now() + 1000)}
    },

    getTGT: async function (tid) {
      t.is(tid, 'valid-tgt')
      return {tid, expires: new Date(Date.now() + 1000)}
    },

    trackServiceLogin: async function (st, tgt, serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {logoutUrl: serviceUrl, serviceTicketId: st.tid}
    }
  }
  const cas = casFactory(context)
  const tgt = await cas.getTicketGrantingTicket('valid-tgt')
  const st = await cas.getServiceTicket('valid-st')
  try {
    const trackedLogin = await cas.trackServiceLogin(st, tgt, 'http://example.com')
    t.is(trackedLogin.logoutUrl, 'http://example.com')
    t.is(trackedLogin.serviceTicketId, 'valid-st')
  } catch (e) {
    t.threw(e)
  }
})

test('throws on broken interface', async (t) => {
  t.plan(5)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function (tid) {
      t.is(tid, 'valid-st')
      return {tid, expires: new Date(Date.now() + 1000)}
    },

    getTGT: async function (tid) {
      t.is(tid, 'valid-tgt')
      return {tid, expires: new Date(Date.now() + 1000)}
    },

    trackServiceLogin: async function (st, tgt, serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  const tgt = await cas.getTicketGrantingTicket('valid-tgt')
  const st = await cas.getServiceTicket('valid-st')
  try {
    await cas.trackServiceLogin(st, tgt, 'http://example.com')
    t.fail('should not happen')
  } catch (e) {
    t.type(e, Error)
    t.match(e, /broken interface/)
  }
})
