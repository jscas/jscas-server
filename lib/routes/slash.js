'use strict'

const indexRoute = {
  path: '/',
  method: 'GET',
  handler: function slash (req, reply) {
    req.log(['debug', 'slash'], 'redirecting request for / to /login')
    reply().redirect('/login')
  }
}

module.exports = [indexRoute]
