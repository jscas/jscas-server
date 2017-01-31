'use strict'

// Provides a catch all error page instead of JSON responses.

const ioc = require('laic').laic.casServer
const plugins = ioc.get('plugins')

module.exports = function errorHandler (request, reply) {
  if (!request.response.isBoom) {
    return reply.continue()
  }

  if (request.api) {
    return reply.continue()
  }

  const boom = request.response
  request.logger.error('encountered error processing `%s`: %j', request.url.path, boom)

  if (boom.isServer) {
    const html = plugins.theme.internalError({
      errorMessage: JSON.stringify(boom.output.payload)
    })
    return reply(html).type('text/html').code(boom.output.statusCode)
  }

  if (boom.output.statusCode > 399 && boom.output.statusCode < 500) {
    const html = plugins.theme.internalError({
      errorMessage: boom.output.payload.message
    })
    return reply(html).type('text/html').code(boom.output.statusCode)
  }

  return reply.continue()
}
