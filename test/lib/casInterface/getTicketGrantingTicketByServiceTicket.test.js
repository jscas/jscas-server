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

test('gets valid ticket', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGTbyST: async function (tid) {
      t.is(tid, 'valid-st')
      return {tid: 'valid-tgt', expires: new Date(Date.now() + 1000)}
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicketByServiceTicket('valid-st')
    .then((ticket) => {
      t.is(ticket.tid, 'valid-tgt')
      t.is(ticket.expired, false)
    })
    .catch(t.threw)
})

test('gets expired ticket', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGTbyST: async function (tid) {
      t.is(tid, 'st-tgt-expired')
      return {tid: 'expired-tgt', expires: new Date(Date.now() - 1000)}
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicketByServiceTicket('st-tgt-expired')
    .then((ticket) => {
      t.is(ticket.tid, 'expired-tgt')
      t.is(ticket.expired, true)
    })
    .catch(t.threw)
})

test('throws for broken interface', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGTbyST: async function (tid) {
      t.is(tid, 'st-tgt-expired')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicketByServiceTicket('st-tgt-expired')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err, /broken interface/)
    })
})
