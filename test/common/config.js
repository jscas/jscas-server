'use strict';

module.exports = {
  server: {
    connection: {
      address: '127.0.0.1',
      port: 9000
    },

    cache: {
      expiresIn: 100
    },

    tgcName: 'test-cookie',

    state: {
      ttl: 100,
      isSecure: false,
      isHttpOnly: false,
      path: '/',
      domain: '127.0.0.1',
      encoding: 'iron',
      password: 'password',
      strictHeader: false
    },

    use303: true,

    session: {
      cookie: {
        isSecure: false,
        isHttpOnly: false
      },

      expiresIn: 100,
      key: 'password',
      name: 'test-session-cookie'
    }
  },

  tickets: {
    loginTicketTTL: 100,
    ticketGrantingTicketTTL: 100,
    serviceTicketTTL: 100
  },

  pino: {
    name: 'mock-server',
    level: 'debug'
  },

  plugins: {
    auth: [require('../mocks/auth')],
    ticketRegistry: require('../mocks/ticketRegistry'),
    serviceRegistry: require('../mocks/serviceRegistry'),
    theme: require('../mocks/theme'),
    misc: []
  },

  pluginsConf: {}
};
