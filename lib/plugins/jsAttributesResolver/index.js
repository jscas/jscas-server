'use strict'

const fp = require('fastify-plugin')
const clone = require('clone')
const merge = require('merge-options')
const defaultConfig = {
  fuser: {
    firstName: 'Foo',
    surname: 'User',
    email: 'fuser@example.com',
    memberOf: [
      'group1',
      'group2'
    ]
  }
}

module.exports = fp(function jsAttributesResolver (server, options, next) {
  const db = merge({}, defaultConfig, options)
  const resolver = {
    async attributesFor (username) {
      if (this.db[username]) {
        return clone(this.db[username])
      }
      return {}
    }
  }
  Object.defineProperty(resolver, 'db', {
    value: db
  })
  server.registerAttributesResolver(resolver)
  next()
})

module.exports.pluginName = 'jsAttributesResolver'
