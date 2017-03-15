'use strict'

const test = require('tap').test
require('../common/setupIOC')()
const cas = require('../../lib/casInterface')

test('returns a valid service', (t) => {
  t.plan(2)
  cas.getService('http://example.com/')
    .then((service) => {
      t.equal(service.name, 'a-service')
      t.equal(service.url, 'http://example.com/')
    })
    .catch((err) => t.threw(err))
})

test('throws error on missing service', (t) => {
  t.plan(2)
  cas.getService('http://missing.example.com/')
    .then(() => t.fail('should not happen'))
    .catch((err) => {
      t.type(err, Error)
      t.match(err.message, /no service found/)
    })
})
