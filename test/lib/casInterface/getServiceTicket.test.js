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

test('returns a valid ticket', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function (tid) {
      t.is(tid, 'valid-st')
      return {tid, expired: false}
    }
  }
  const cas = casFactory(context)
  cas.getServiceTicket('valid-st')
    .then((ticket) => {
      t.is(ticket.tid, 'valid-st')
      t.is(ticket.expired, false)
    })
    .catch((err) => t.threw(err))
})

test('returns expired ticket', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function (tid) {
      t.is(tid, 'expired-st')
      return {tid, expires: new Date(Date.now() - 1000)}
    }
  }
  const cas = casFactory(context)
  cas.getServiceTicket('expired-st')
    .then((ticket) => {
      t.is(ticket.tid, 'expired-st')
      t.is(ticket.expired, true)
    })
})

test('throws for interface problem', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function (tid) {
      t.is(tid, 'expired-st')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.getServiceTicket('expired-st')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err, /broken interface/)
    })
})
