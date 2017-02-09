'use strict'

const indexRoute = {
  path: '/',
  method: 'GET',
  handler: function slash (req, reply) {
    req.logger.debug('redirecting request for / to /login')
    reply().redirect('/login')
  }
}

module.exports = [indexRoute]
