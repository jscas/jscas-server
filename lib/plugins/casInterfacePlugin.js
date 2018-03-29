'use strict'

const fp = require('fastify-plugin')
const casInterface = require('../casInterface')

module.exports = fp(function casInterfacePlugin (fastify, options, next) {
  fastify.decorate('jscasInterface', casInterface({
    ticketRegistry: fastify.jscasPlugins.ticketRegistry,
    serviceRegistry: fastify.jscasPlugins.serviceRegistry
  }))
  next()
})
