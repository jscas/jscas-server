'use strict'

const test = require('tap').test
const logger = require('abstract-logging')

require('./common/setupIOC')()
const protocol1 = require('../lib/routes/protocol1')

test('validates service ticket in parameters', (t) => {
  t.plan(1)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    t.equal(response, 'yes\n')
  }

  protocol1[0].handler(request, reply)
})

test('validates service ticket in query', (t) => {
  t.plan(1)
  const request = {
    query: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    t.equal(response, 'yes\n')
  }

  protocol1[0].handler(request, reply)
})

test('rejects bad service ticket', (t) => {
  t.plan(1)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'unknown'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    t.equal(response, 'no\n')
  }

  protocol1[0].handler(request, reply)
})

test('rejects expired service ticket', (t) => {
  t.plan(1)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'expired-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    t.equal(response, 'no\n')
  }

  protocol1[0].handler(request, reply)
})
