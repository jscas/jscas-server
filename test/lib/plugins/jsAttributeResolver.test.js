'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/jsAttributesResolver')

const serverProto = {
  jscasPlugins: {
    attributeResolver: {}
  },
  registerAttributeResolver (obj) {
    this.jscasPlugins.attributeResolver = obj
  }
}

test('returns attributes for default user', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const result = await server.jscasPlugins.attributeResolver.attributesFor('fuser')
    t.strictDeepEqual(result, {
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

test('overwrites default config', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  const opts = {
    fuser: {
      firstName: 'bar'
    }
  }
  plugin(server, opts, async () => {
    const result = await server.jscasPlugins.attributeResolver.attributesFor('fuser')
    t.is(result.firstName, 'bar')
  })
})

test('returns empty object for non-existent user', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const attrs = await server.jscasPlugins.attributeResolver.attributesFor('none')
    t.strictDeepEqual(attrs, {})
  })
})
