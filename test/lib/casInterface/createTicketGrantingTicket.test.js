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

test('creates valid tickets', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    genTGT: async function (username, date) {
      t.is(username, 'foo')
      return {tid: 'valid-tgt'}
    }
  }
  const cas = casFactory(context)
  cas.createTicketGrantingTicket('foo')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.equal(ticket.tid, 'valid-tgt')
    })
    .catch(t.threw)
})

test('throws on error', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    genTGT: async function (username, date) {
      t.is(username, 'baduser')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.createTicketGrantingTicket('baduser')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err, /broken interface/)
    })
})
