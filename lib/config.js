'use strict'

// This is the default configuration for the server. For a description of
// each parameter see the "Configuration.md" document in the `/docs`
// directory.

const path = require('path')
const isDebug = require('isdebug')
const nixconfig = require('nixconfig')
const fastifyCaching = require('fastify-caching')

const maxAge = 1800000 // 30 minutes in milliseconds
const cookieOptions = {
  domain: '.cas.example.com',
  path: '/',
  expires: maxAge,
  secure: true,
  // If testing with localhost sites and Chrome, use 'lax'
  sameSite: true,
  httpOnly: true
}

const initialConfig = {
  logger: {
    name: 'jscas-server',
    prettyPrint: isDebug,
    level: (isDebug) ? 'debug' : 'info'
  },

  server: {
    address: '127.0.0.1',
    port: 9000
  },

  caching: {
    // This should always be NOCACHE.
    privacy: fastifyCaching.privacy.NOCACHE,
    cacheSegment: 'jscas',
    cache: {
      driver: {
        name: undefined,
        options: {}
      }
    }
  },

  helmet: {},

  dataSources: undefined,
  // dataSources: {
  //   mongodb: {},
  //   postgres: {},
  //   redis: {}
  // }

  // Options for fastify-cookie.
  cookie: cookieOptions,

  session: {
    secretKey: 'some-secret-password-at-least-32-characters-long',
    sessionMaxAge: maxAge,
    cookie: cookieOptions
  },

  tickets: {
    serviceTicket: {
      ttl: 10000
    },
    ticketGrantingTicket: {
      cookieName: 'jscas-tgt',
      ttl: maxAge
    }
  },

  // Set to `true` to return user attributes via the `/serviceValidate` endpoint.
  v3overv2: false,

  // Set to `true` to include a "UDC_IDENTIFIER" attribute with every
  // `/samlValidate` request. The attribute value will be set to the same
  // value as the standard CAS "user" value, i.e. the username. This is to
  // enable compliance with the SIS product Banner 9. Note: this value gets
  // mapped to a value in Banner's `general.gobumap` table.
  saml11Banner9Hack: false,

  // Given a string name the server will attempt to `require` the module.
  // If the string begins with `~/`, it indicates that the "module" is within
  // the server's `lib/plugins/` directory, i.e. is one of the shipped demo
  // plugins.
  //
  // Otherwise, you may specify already required instances.
  plugins: {
    theme: '~/basicTheme',
    attributesResolver: '~/jsAttributesResolver',
    serviceRegistry: '~/jsServiceRegistry',
    ticketRegistry: '~/jsTicketRegistry',
    auth: [
      '~/jsIdP'
    ],
    misc: []
  },

  pluginsConf: {}
}

const config = nixconfig({
  initialConfig,
  parentName: 'jscas',
  parentPath: path.resolve(path.join(__dirname, '..')),
  loaders: Object.assign({}, require('nixconfig-yaml'), require('nixconfig-toml'))
})

module.exports = config
