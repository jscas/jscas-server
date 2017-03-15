'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('creates valid tickets', (t) => {
  t.plan(2)
  cas.createTicketGrantingTicket('fbar')
    .then((ticket) => {
      t.ok(ticket.tid)
      t.equal(ticket.tid, 'valid-tgt')
    })
    .catch((err) => t.threw(err))
})

test('throws on error', (t) => {
  t.plan(2)
  cas.createTicketGrantingTicket('baduser')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /expired ticket/)
    })
})
