'use strict'

const indexRoute = {
  path: '/',
  method: 'GET',
  handler: function slash (req, reply) {
    reply().redirect('/login')
  }
}

module.exports = [indexRoute]
