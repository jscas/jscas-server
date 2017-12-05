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

test('invalidates a good ticket', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function () {
      return {tid: 'valid-st', expired: false, valid: true}
    },

    invalidateST: async function (tid) {
      t.is(tid, 'valid-st')
      return {tid, valid: false}
    }
  }
  const cas = casFactory(context)
  cas.getServiceTicket('valid-st')
    .then((ticket) => {
      t.is(ticket.valid, true)

      cas.invalidateServiceTicket(ticket.tid)
        .then((ticket) => {
          t.is(ticket.valid, false)
        })
        .catch(t.threw)
    })
    .catch(t.threw)
})

test('throws for broken interface', (t) => {
  t.plan(4)
  const context = clone(contextProto)
  context.ticketRegistry = {
    getST: async function () {
      return {tid: 'valid-st', expired: false, valid: true}
    },

    invalidateST: async function (tid) {
      t.is(tid, 'valid-st')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.getServiceTicket('valid-st')
    .then((ticket) => {
      t.is(ticket.valid, true)

      cas.invalidateServiceTicket(ticket.tid)
        .then(() => t.fail('should not happen'))
        .catch((err) => {
          t.type(err, Error)
          t.match(err, /broken interface/)
        })
    })
    .catch(t.threw)
})
