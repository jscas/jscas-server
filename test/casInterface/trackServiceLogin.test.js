'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('updates a tgt correctly', (t) => {
  t.plan(5)

  // a nice pyramid because we need to get both tickets necessary for tracking
  cas.getTicketGrantingTicket('valid-tgt')
    .then((tgt) => {
      cas.getServiceTicket('valid-st')
        .then((st) => {
          cas.trackServiceLogin(st, tgt, 'http://example.com/')
            .then((updatedTGT) => {
              t.equal(updatedTGT.tid, tgt.tid)
              t.type(updatedTGT.services, Array)
              t.equal(updatedTGT.services.length, 1)
              t.equal(updatedTGT.services[0].loginUrl, 'http://example.com/')
              t.equal(updatedTGT.services[0].serviceId, st.tid)
            })
            .catch((err) => t.threw(err))
        })
        .catch((err) => t.threw(err))
    })
    .catch((err) => t.threw(err))
})
