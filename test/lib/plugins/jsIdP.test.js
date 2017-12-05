'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/jsIdP')

const serverProto = {
  jscasHooks: {
    userAttributes: []
  },
  jscasPlugins: {
    auth: []
  },
  registerAuthenticator (obj) {
    this.jscasPlugins.auth.push(obj)
  },
  registerHook (name, fn) {
    this.jscasHooks[name].push(fn)
  }
}

test('validates default user', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    t.is(server.jscasPlugins.auth.length, 1)

    const result = await server.jscasPlugins.auth[0].validate('fuser', '123456')
    t.is(result, true)
  })
})

test('overwrites default config', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  const opts = {
    fuser: {
      password: '654321'
    }
  }
  plugin(server, opts, async () => {
    const result = await server.jscasPlugins.auth[0].validate('fuser', '654321')
    t.is(result, true)
  })
})

test('userAttributes hook returns unique attributes object', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const attrs = await server.jscasHooks.userAttributes[0]('fuser')
    t.strictDeepEqual(attrs, {
      firstName: 'Foo',
      surname: 'User',
      email: 'fuser@example.com',
      memberOf: [
        'group1',
        'group2'
      ]
    })
  })
})

test('userAttributes hook return empty object for non-existent user', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const attrs = await server.jscasHooks.userAttributes[0]('none')
    t.strictDeepEqual(attrs, {})
  })
})
