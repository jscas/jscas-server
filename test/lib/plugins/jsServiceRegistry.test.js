'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/jsServiceRegistry')

const serverProto = {
  jscasPlugins: {
    serviceRegistry: {}
  },
  registerServiceRegistry (obj) {
    this.jscasPlugins.serviceRegistry = obj
  }
}

test('returns a registry with default services', async (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    t.type(server.jscasPlugins.serviceRegistry.getServiceWithName, Function)
    t.type(server.jscasPlugins.serviceRegistry.getServiceWithUrl, Function)
    t.type(server.jscasPlugins.serviceRegistry.close, Function)
  })
})

test('returns a registry with configured services', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  const options = {
    services: [
      {name: 'foo', url: 'foo'},
      {name: 'bar', url: 'bar'}
    ]
  }
  plugin(server, options, async () => {
    const foo = await server.jscasPlugins.serviceRegistry.getServiceWithName('foo')
    t.deepEqual(foo, {name: 'foo', url: 'foo'})

    const bar = await server.jscasPlugins.serviceRegistry.getServiceWithUrl('bar')
    t.deepEqual(bar, {name: 'bar', url: 'bar'})
  })
})
