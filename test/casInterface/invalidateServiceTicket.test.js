'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('invalidates a good ticket', (t) => {
  t.plan(2)
  cas.getServiceTicket('valid-st')
    .then((ticket) => {
      t.equal(ticket.valid, true)

      cas.invalidateServiceTicket(ticket.tid)
        .then((ticket) => {
          t.equal(ticket.valid, false)
        })
        .catch((err) => t.threw(err))
    })
    .catch((err) => t.threw(err))
})
