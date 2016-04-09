'use strict';

const sessionTTL = 60 * 1000;

module.exports = {
  // web server
  server: {
    connection: { // address and port for web server to bind to
      address: '127.0.0.1',
      port: 9000
    },

    // http://hapijs.com/api#new-serveroptions (`cache` property)
    // configure Hapi's internal cache management (via a catbox engine)
    // this is used by the session management for storing its data
    // thus, if you want your session information stored somewhere like
    // a Redis server, this is where you supply that information
    //
    // set to `false`, or omit, to stick with Hapi's default memory engine
    cache: false,

    // name for the Ticket Granting Cookie (TGC)
    tgcName: 'TGC-JSCAS',

    // options for configuring Hapi's state API
    // cas-server uses the state API for the TGC
    // cas-server uses the 'iron' encoding by default
    // this object must conform to http://hapijs.com/api#serverstatename-options
    state: {
      // this sets how long a TGC will last
      // this should match the session TTL defined in session.expiresIn
      ttl: sessionTTL,

      isSecure: false, // should be `true` in production
      isHttpOnly: true,

      // this value is appropriate for a server at 'https://cas.example.com'
      // it should be '/cas' for 'https://example.com/cas'
      // i.e. be very specific about the cookie path
      path: '/',

      domain: '127.0.0.1',

      encoding: 'iron',
      // encryption key for Iron's encoding
      password: 'some quite good password at least 32 characters long',

      strictHeader: false
    },

    // after successful authentication either a 303 redirect can be used
    // or an intermediate "we are redirecting you" page can be used
    // if this is set to false, the intermediate page will be used
    use303: true,

    // https://www.npmjs.com/package/hapi-easy-session#options
    session: {
      cookie: {
        isSecure: false, // should be `true` in production
        isHttpOnly: true
      },

      // should match state.ttl
      expiresIn: sessionTTL,

      // required by virtue of using expiresIn
      // used to sign the session cookie
      key: 'some really awesome secret key',

      // what to call your cas server session cookie
      name: 'casjs',

      cache: {
        segment: 'jscas-session',
        expiresIn: sessionTTL
      }
    },

    // options for the Marko template engine
    // if you enable writeToDisk then the user running the server will need
    // write access to lib/xmlTemplates
    marko: {
      writeToDisk: false,
      checkUpToDate: true
    }
  },

  // lifetimes for all ticket types
  tickets: {
    loginTicketTTL: 5 * 60 * 1000,
    ticketGrantingTicketTTL: sessionTTL,
    serviceTicketTTL: 60 * 1000
  },

  // logging
  pino: {
    // https://www.npmjs.com/package/pino
    name: 'jscas-server',
    level: 'debug'
  },

  // data sources are passed to plugins so that all plugins may use
  // the same databases
  // each plugin should not which data sources it requires
  dataSources: {
    // http://knexjs.org/#Installation-client
    // set to `false` to skip initializing knex
    // othewise, set to a full knex configuration object for the server's
    // environment, i.e. don't use environments segregation as is possible
    // in a knexfile.js
    // whichever database you use, you will need to install the driver
    // alonside this configuration (e.g. `npm install pg`)
    knex: false
  },

  plugins: {
    // at least one authentication plugin is required
    // the first to validate wins
    auth: [
      require('cas-server-auth-json')
    ],

    // only one ticket registry is allowed per server
    ticketRegistry: require('cas-server-pg-ticket-registry'),

    // only one service registry is allowed per server
    serviceRegistry: require('cas-server-pg-service-registry'),

    // if you need multiple themes, you should run multiple instances
    // and direct traffic to them through something like HAProxy
    theme: require('cas-server-theme'),

    misc: []
  },

  pluginsConf: {
    // a basic authentication plugin that reads credentials from a JSON file
    // view the plugin's Readme.md for details on the file structure
    // the default configuration use's the plugin's sample data file
    authJSON: {
      //credentialStore: '/path/to/store.json'
    },

    // a ticket registry plugin backed by a PostgreSQL database
    pgTicketRegistry: {},

    // a service registry plugin backed by a PostgreSQL database
    pgServiceRegistry: {}
  }
};
