'use strict'

const fp = require('fastify-plugin')
const merge = require('merge-options')

const defaultOptions = {
  paths: ['/login'],
  aliases: {
    TARGET: 'service',
    SAMLart: 'ticket'
  }
}

function aliasParametersPlugin (fastify, options, next) {
  const opts = merge({}, defaultOptions, options || {})
  fastify.addHook('preHandler', function (request, reply, next) {
    if (opts.paths.includes(request.urlData('path')) === false) return next()
    Object.keys(request.query).forEach((k) => {
      if (opts.aliases[k]) {
        request.query[opts.aliases[k]] = request.query[k]
      }
    })
    next()
  })
  next()
}

module.exports = fp(aliasParametersPlugin, {
  decorators: {
    request: ['urlData']
  }
})
