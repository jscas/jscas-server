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

test('returns a ticket for valid id', (t) => {
  t.plan(4)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGT: async function (tid) {
      t.is(tid, 'valid-tgt')
      return {tid, expires: new Date(Date.now() + 1000)}
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicket('valid-tgt')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.is(ticket.tid, 'valid-tgt')
      t.is(ticket.expired, false)
    })
    .catch(t.threw)
})

test('return an expired ticket', (t) => {
  t.plan(2)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGT: async function (tid) {
      t.is(tid, 'expired-tgt')
      return {tid, expires: new Date(Date.now() - 1000)}
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicket('expired-tgt')
    .then((ticket) => {
      t.is(ticket.expired, true)
    })
    .catch(t.threw)
})

test('throws for broken interface', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getTGT: async function (tid) {
      t.is(tid, 'missing-tgt')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.getTicketGrantingTicket('missing-tgt')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /broken interface/)
    })
})
