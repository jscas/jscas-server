'use strict'
/* eslint-env node, mocha */

const expect = require('chai').expect

require('./common/setupIOC')()
const protocol1 = require('../lib/routes/protocol1')

suite('Protocol 1')

test('validates service ticket in parameters', function validateST (done) {
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get'
  }

  function reply (response) {
    expect(response).to.equal('yes\n')
    done()
  }

  protocol1[0].handler(request, reply)
})

test('validates service ticket in query', function validateSTQuery (done) {
  const request = {
    query: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get'
  }

  function reply (response) {
    expect(response).to.equal('yes\n')
    done()
  }

  protocol1[0].handler(request, reply)
})

test('rejects bad service ticket', function rejectBadTicket (done) {
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'unknown'
    },
    method: 'get'
  }

  function reply (response) {
    expect(response).to.equal('no\n')
    done()
  }

  protocol1[0].handler(request, reply)
})

test('rejects expired service ticket', function rejectBadTicket (done) {
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'expired-st'
    },
    method: 'get'
  }

  function reply (response) {
    expect(response).to.equal('no\n')
    done()
  }

  protocol1[0].handler(request, reply)
})
