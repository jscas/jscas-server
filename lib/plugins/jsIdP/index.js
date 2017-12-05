'use strict'

const fp = require('fastify-plugin')
const clone = require('clone')
const merge = require('merge-options')
const defaultConfig = {
  fuser: {
    password: '123456',
    firstName: 'Foo',
    surname: 'User',
    email: 'fuser@example.com',
    memberOf: [
      'group1',
      'group2'
    ]
  }
}

const authenticatorProto = {
  validate: async function jsIdPValidator (username, password) {
    if (this.db[username] && this.db[username].password === password) return true
    return false
  }
}

module.exports = fp(function jsIdP (server, options, next) {
  const db = merge({}, defaultConfig, options)
  const authenticator = Object.create(authenticatorProto, {
    db: {value: db}
  })
  server.registerAuthenticator(authenticator)

  server.registerHook('userAttributes', async function jsIdPUserAttrsHook (id) {
    if (!authenticator.db[id]) return {}
    const attrs = clone(authenticator.db[id])
    delete attrs.password
    return attrs
  })

  next()
})

module.exports.pluginName = 'jsIdP'
