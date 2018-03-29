'use strict'

const fp = require('fastify-plugin')
const Tokens = require('csrf')

function csrfPlugin (fastify, options, next) {
  const tokens = new Tokens(options || {})

  fastify.decorateRequest('isValidCsrfToken', function validateCSRF (received) {
    this.log.trace('using `%s` to verify: %s', this.session.csrfSecret, received)
    return tokens.verify(this.session.csrfSecret, received)
  })

  fastify.addHook('preHandler', function csrfPreHandler (req, reply, done) {
    if (req.session && req.session.csrfSecret) {
      req.session.csrfToken = tokens.create(req.session.csrfSecret)
      return done()
    }

    tokens.secret((err, secret) => {
      if (err) return done(err)
      req.session.csrfSecret = secret
      req.session.csrfToken = tokens.create(secret)
      done()
    })
  })

  next()
}

module.exports = fp(csrfPlugin)
