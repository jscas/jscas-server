'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('successfully creates service tickets', (t) => {
  t.plan(2)
  cas.createServiceTicket('valid-tgt', 'a-service')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.equal(ticket.tid, 'valid-st')
    })
    .catch((err) => t.threw(err))
})

test('throws for invalid tgt', (t) => {
  t.plan(2)
  cas.createServiceTicket('invalid-tgt', 'no-service')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /invalid tgt/)
    })
})

test('throws for invalid service', (t) => {
  t.plan(2)
  cas.createServiceTicket('valid-tgt', 'no-service')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /invalid service/)
    })
})
