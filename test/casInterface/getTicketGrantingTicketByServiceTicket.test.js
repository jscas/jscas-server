'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('gets valid ticket', (t) => {
  t.plan(2)
  cas.getTicketGrantingTicketByServiceTicket('valid-st')
    .then((ticket) => {
      t.equal(ticket.tid, 'valid-tgt')
      t.equal(ticket.expired, false)
    })
    .catch((err) => t.threw(err))
})

test('gets expired ticket', (t) => {
  t.plan(2)
  cas.getTicketGrantingTicketByServiceTicket('st-tgt-expired')
    .then((ticket) => {
      t.equal(ticket.tid, 'expired-tgt')
      t.equal(ticket.expired, true)
    })
    .catch((err) => t.threw(err))
})
