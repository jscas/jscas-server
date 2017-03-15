'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('returns a ticket for valid id', (t) => {
  t.plan(3)
  cas.getTicketGrantingTicket('valid-tgt')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.equal(ticket.tid, 'valid-tgt')
      t.equal(ticket.expired, false)
    })
    .catch((err) => t.threw(err))
})

test('return an expired ticket', (t) => {
  t.plan(1)
  cas.getTicketGrantingTicket('expired-tgt')
    .then((ticket) => {
      t.equal(ticket.expired, true)
    })
    .catch((err) => t.threw(err))
})

test('throws for missing ticket', (t) => {
  t.plan(2)
  cas.getTicketGrantingTicket('missing-tgt')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /could not find ticket/)
    })
})
