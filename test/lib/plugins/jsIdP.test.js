'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/jsIdP')

const serverProto = {
  jscasPlugins: {
    auth: []
  },
  registerAuthenticator (obj) {
    this.jscasPlugins.auth.push(obj)
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
