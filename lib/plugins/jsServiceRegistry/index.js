'use strict'

const fp = require('fastify-plugin')

const registry = {
  services: [
    {name: 'localhost', url: 'http://localhost:9000/casauth', comment: ''},
    {name: 'app.example', url: 'http://app.example.com/casauth', comment: ''}
  ],

  getServiceWithName: async function getServiceWithName (name) {
    return this.services.find((svc) => svc.name === name)
  },

  getServiceWithUrl: async function getServiceWithUrl (url) {
    return this.services.find((svc) => svc.url === url)
  },

  close: async function close () {
    return Promise.resolve()
  }
}

module.exports = fp(function jsServiceRegistry (server, options, next) {
  const instance = Object.create(registry)
  if (options.services) {
    instance.services.splice(0)
    options.services.forEach((svc) => instance.services.push(svc))
  }
  server.registerServiceRegistry(instance)
  next()
})

module.exports.pluginName = 'jsServiceRegistry'
