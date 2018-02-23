'use strict'

const fp = require('fastify-plugin')

module.exports = fp(function (fastify, opts, next) {
  const theme = fastify.jscasPlugins.theme

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).type('text/html').send(theme.serverError({
      error: Error('Sorry, we could not find that page.')
    }))
  })

  fastify.setErrorHandler(function (error, req, reply) {
    reply.code(error.statusCode).type('text/html').send(theme.serverError({error}))
  })

  next()
})
