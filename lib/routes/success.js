'use strict'

const ioc = require('laic').laic.casServer
const theme = ioc.get('plugins').theme

const successRoute = {
  path: '/success',
  method: 'GET',
  config: {
    cache: {
      privacy: 'private',
      expiresIn: 0
    }
  },
  handler: function success (req, reply) {
    req.log(['debug', 'success'], 'got /success GET')
    reply(theme.noService())
  }
}

module.exports = [successRoute]
