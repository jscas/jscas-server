'use strict'

const tap = require('tap')
const test = tap.test
const clone = require('clone')
const mockquire = require('mock-require')
const nullLogger = require('../../nullLogger')
const casFactory = require('../../../lib/casInterface')

const contextProto = {
  serviceRegistry: {},
  ticketRegistry: {}
}

mockquire('../../../lib/config', {
  get (path) {
    return 100
  }
})
mockquire('../../../lib/logger', () => nullLogger)

tap.tearDown(() => {
  mockquire.stopAll()
})

test('returns a valid service', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.serviceRegistry = {
    getServiceWithUrl: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url}
    }
  }
  const cas = casFactory(context)
  cas.getService('http://example.com')
    .then((service) => {
      t.is(service.name, 'foo')
      t.is(service.url, 'http://example.com')
    })
    .catch(t.threw)
})

test('throws error on broken interface', (t) => {
  t.plan(3)
  const context = clone(contextProto)
  context.serviceRegistry = {
    getServiceWithUrl: async function (url) {
      t.is(url, 'http://example.com')
      throw Error('broken interface')
    }
  }
  const cas = casFactory(context)
  cas.getService('http://example.com')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err, /broken interface/)
    })
})
