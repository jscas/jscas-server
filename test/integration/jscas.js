'use strict'

module.exports = {
  logger: {
    level: 'silent'
  },

  server: {
    port: process.env.jscas_server_port
  },

  cookie: {
    domain: '.' + process.env.jscas_domain || '127.0.0.1',
    path: '/',
    expires: 3600000,
    secure: false,
    sameSite: 'lax',
    httpOnly: true
  },

  session: {
    secretKey: '12345678901234567890123456789012',
    sessionMaxAge: 3600000,
    cookie: {
      domain: '.' + process.env.jscas_domain || '127.0.0.1',
      path: '/',
      expires: 3600000,
      secure: false,
      sameSite: 'lax',
      httpOnly: true
    }
  },

  pluginsConf: {
    jsIdP: {
      auser: {
        password: '123456',
        firstName: 'A',
        surname: 'User',
        email: 'auser@example.com',
        memberOf: [
          'group1',
          'group2'
        ]
      }
    },

    jsServiceRegistry: {
      services: [
        {name: 'app', url: 'http://app.example.com/casauth'}
      ]
    }
  }
}
