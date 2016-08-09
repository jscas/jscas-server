'use strict'
/* eslint-env node, mocha */

require('thunk-mocha')()
const expect = require('chai').expect

require('./common/setupIOC')()
const cas = require('../lib/casInterface')

suite('CAS', function () {
  suite('#createServiceTicket', function () {
    test('successfully creates service tickets', function * () {
      const ticket = yield cas.createServiceTicket('valid-tgt', 'a-service')
      expect(ticket.tid).to.exist
      expect(ticket.tid).to.equal('valid-st')
    })

    test('throws for invalid tgt', function * () {
      try {
        yield cas.createServiceTicket('invalid-tgt', 'no-service')
      } catch (e) {
        expect(e).to.be.an.instanceof(Error)
        expect(e.message).to.contain('invalid tgt')
      }
    })

    test('throws for invalid service', function * () {
      try {
        yield cas.createServiceTicket('valid-tgt', 'no-service')
      } catch (e) {
        expect(e).to.be.an.instanceof(Error)
        expect(e.message).to.contain('invalid service')
      }
    })
  })

  suite('#createTicketGrantingTicket', function () {
    test('creates valid tickets', function * () {
      const ticket = yield cas.createTicketGrantingTicket('fbar')
      expect(ticket.tid).to.exist
      expect(ticket.tid).to.equal('valid-tgt')
    })

    test('throws on error', function * () {
      try {
        yield cas.createTicketGrantingTicket('baduser')
      } catch (e) {
        expect(e).to.be.an.instanceof(Error)
        expect(e.message).to.contain('expired ticket')
      }
    })
  })

  suite('#getService', function () {
    test('returns a valid service', function * () {
      const service = yield cas.getService('http://example.com/')
      expect(service.name).to.equal('a-service')
      expect(service.url).to.equal('http://example.com/')
    })

    test('throws error on missing service', function * () {
      try {
        yield cas.getService('http://missing.example.com/')
      } catch (e) {
        expect(e).to.be.an.instanceof(Error)
        expect(e.message).to.contain('no service found')
      }
    })
  })

  suite('#getTicketGrantingTicket', function () {
    test('returns a ticket for valid id', function * () {
      const ticket = yield cas.getTicketGrantingTicket('valid-tgt')
      expect(ticket.tid).to.exist
      expect(ticket.tid).to.equal('valid-tgt')
      expect(ticket.expired).to.be.false
    })

    test('return an expired ticket', function * () {
      const ticket = yield cas.getTicketGrantingTicket('expired-tgt')
      expect(ticket.expired).to.be.true
    })

    test('throws for missing ticket', function * () {
      try {
        yield cas.getTicketGrantingTicket('missing-tgt')
      } catch (e) {
        expect(e).to.be.an.instanceof(Error)
        expect(e.message).to.contain('could not find ticket')
      }
    })
  })
})
