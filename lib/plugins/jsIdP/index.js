'use strict'

const fp = require('fastify-plugin')
const merge = require('merge-options')
const defaultConfig = {
  fuser: {
    password: '123456'
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
  next()
})

module.exports.pluginName = 'jsIdP'
