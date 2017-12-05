'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/pluginApiPlugin')

const serverProto = {
  decorate: function (name, val) {
    Object.defineProperty(this, name, {value: val})
  },
  jscasPlugins: {
    ticketRegistry: {},
    serviceRegistry: {},
    theme: {},
    auth: [],
    misc: []
  },
  jscasHooks: {
    userAttributes: []
  }
}

test('registers authenticators', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    server.registerAuthenticator({
      validate: async function (username, password) {
        t.is(username, 'foo')
        t.is(password, 'bar')
        return true
      }
    })
    t.is(server.jscasPlugins.auth.length, 1)
    server.jscasPlugins.auth[0].validate('foo', 'bar')
      .then((result) => t.is(result, true))
      .catch(t.threw)
  })
})

test('registers hook functions', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    server.registerHook('userAttributes', async function (username) {
      t.is(username, 'foo')
      return {foo: true}
    })
    t.is(server.jscasHooks.userAttributes.length, 1)
    const result = await server.jscasHooks.userAttributes[0]('foo')
    t.type(result, Object)
    t.is(result.foo, true)
  })
})

test('skips registering for non-existent hooks', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    server.registerHook('oops', 'nothing')
    t.notOk(server.jscasHooks.oops)
  })
})

test('registers misc plugin', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    server.registerMiscPlugin('foo')
    t.is(server.jscasPlugins.misc.length, 1)
    t.is(server.jscasPlugins.misc[0], 'foo')
  })
})

test('registers serviceRegistry', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    server.registerServiceRegistry({foo: 'foo'})
    t.type(server.jscasPlugins.serviceRegistry, Object)
    t.ok(server.jscasPlugins.serviceRegistry.foo)
    t.is(server.jscasPlugins.serviceRegistry.foo, 'foo')
  })
})

test('registers theme', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    server.registerTheme({foo: 'foo'})
    t.type(server.jscasPlugins.theme, Object)
    t.ok(server.jscasPlugins.theme.foo)
    t.is(server.jscasPlugins.theme.foo, 'foo')
  })
})

test('registers ticketRegistry', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    server.registerTicketRegistry({foo: 'foo'})
    t.type(server.jscasPlugins.ticketRegistry, Object)
    t.ok(server.jscasPlugins.ticketRegistry.foo)
    t.is(server.jscasPlugins.ticketRegistry.foo, 'foo')
  })
})
