'use strict'

const fp = require('fastify-plugin')

module.exports = fp(function slashRoutePlugin (fastify, options, next) {
  fastify.register(require('fastify-url-data'))
  fastify.get('/', function slashHandler (req, reply) {
    req.log.debug('redirecting request for / to /login')
    const query = req.urlData('query')
    if (query) return reply.redirect(302, `/login?${query}`)
    reply.redirect(302, '/login')
  })
  next()
})
