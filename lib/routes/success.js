'use strict'

const fp = require('fastify-plugin')

function successHandler (req, reply) {
  reply.send(this.jscasPlugins.theme.noService())
}

function successRoutePlugin (fastify, options, next) {
  fastify.get('/success', successHandler)
  next()
}

module.exports = fp(successRoutePlugin)
