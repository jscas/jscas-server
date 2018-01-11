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

test('successfully creates service tickets', (t) => {
  t.plan(4)
  const context = clone(contextProto)
  context.ticketRegistry = {
    genST: async function (tgtId, serviceName, date) {
      t.is(tgtId, 'valid-tgt')
      t.is(serviceName, 'a-service')
      return {tid: 'valid-st'}
    }
  }
  const cas = casFactory(context)
  cas.createServiceTicket('valid-tgt', 'a-service')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.equal(ticket.tid, 'valid-st')
    })
    .catch(t.threw)
})

test('throws for registry problems', (t) => {
  t.plan(2)
  const context = clone(contextProto)
  context.ticketRegistry = {
    genST: async function () {
      throw Error('broken registry')
    }
  }
  const cas = casFactory(context)
  cas.createServiceTicket('invalid-tgt', 'no-service')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err, /broken registry/)
    })
})
