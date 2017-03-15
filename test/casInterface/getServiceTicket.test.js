'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('returns a valid ticket', (t) => {
  t.plan(2)
  cas.getServiceTicket('valid-st')
    .then((ticket) => {
      t.equal(ticket.tid, 'valid-st')
      t.equal(ticket.expired, false)
    })
    .catch((err) => t.threw(err))
})

test('returns expired ticket', (t) => {
  t.plan(2)
  cas.getServiceTicket('expired-st')
    .then((ticket) => {
      t.equal(ticket.tid, 'expired-st')
      t.equal(ticket.expired, true)
    })
})
