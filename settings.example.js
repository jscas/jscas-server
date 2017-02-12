'use strict'

const sessionTTL = 60 * 1000

// Unless otherwise noted, each configuration property shown in this
// example configuration is required to be defined.
module.exports = {
  // Configuration for components directly releated to the Hapi web
  // server instance.
  server: {
    connection: { // Address and port for web server to bind to.
      address: '127.0.0.1',
      port: 9000
    },

    // http://hapijs.com/api#new-serveroptions (`cache` property)
    // Configure Hapi's internal cache management (via a catbox engine).
    // This is used by the session management for storing its data.
    // Thus, if you want your session information stored somewhere like
    // a Redis server, this is where you supply that information.
    //
    // Set to `false`, or omit, to stick with Hapi's default memory engine.
    cache: false,

    // Name for the Ticket Granting Cookie (TGC).
    tgcName: 'TGC-JSCAS',

    // Options for configuring Hapi's state API.
    // cas-server uses the state API for the TGC.
    // cas-server uses the 'iron' encoding by default.
    // This object must conform to http://hapijs.com/api#serverstatename-options
    state: {
      // This sets how long a TGC will last.
      // This should match the session TTL defined in `session.expiresIn`.
      ttl: sessionTTL,

      isSecure: false, // Should be `true` in production.
      isHttpOnly: true,

      // This value is appropriate for a server at 'https://cas.example.com'.
      // It should be '/cas' for 'https://example.com/cas',
      // i.e. be very specific about the cookie path.
      path: '/',

      domain: '127.0.0.1',

      encoding: 'iron',
      // Encryption key for Iron's encoding. It must be at least
      // 32 characters long.
      password: 'some quite good password at least 32 characters long',

      strictHeader: false
    },

    // After successful authentication either a 303 redirect can be used
    // or an intermediate "we are redirecting you" page can be used.
    // If this is set to false, the intermediate page will be used.
    use303: true,

    // https://www.npmjs.com/package/hapi-easy-session#options
    session: {
      cookie: {
        isSecure: false, // Should be `true` in production.
        isHttpOnly: true
      },

      // Should match `state.ttl`.
      expiresIn: sessionTTL,

      // Required by virtue of using expiresIn.
      // Used to sign the session cookie.
      key: 'some really awesome secret key',

      // What to call your cas-server session cookie.
      name: 'casjs',

      cache: {
        segment: 'jscas-session',
        expiresIn: sessionTTL
      }
    }
  },

  // Lifetimes for all ticket types.
  // The TGT lifetime should match the server's session lifetime. It is used
  // to determine if a user, having been redirected from an external application
  // for authorization, is allowed to issue service tickets. If the TGT has
  // expired, the user may as well not be considered "logged in" and the session
  // should be terminated.
  // The service ticket lifetime determines how long a service has to verify
  // a service ticket after a user has authenticated and been redirected back
  // to the requesting service. This should be a very short time, but long
  // enough to account for slow connections.
  tickets: {
    ticketGrantingTicketTTL: sessionTTL,
    serviceTicketTTL: 60 * 1000
  },

  // Settings for the internal logger. You most likely want to set the level
  // to 'info' in production.
  pino: {
    // https://www.npmjs.com/package/pino
    name: 'jscas-server',
    level: 'debug',

    // Set to `true` to enable pretty printing of log messages. This is meant
    // to make logs easier to read during development. Regular JSON logs are
    // more versatile for production.
    //
    // This can also be set to a pretty print configuratin object as is outlined
    // in the Pino documentation.
    prettyPrint: false
  },

  // Data sources are passed to plugins so that all plugins may use
  // the same databases.
  // Each plugin should note which data sources it requires.
  dataSources: {
    // http://mongoosejs.com/docs/connections.html
    // Set to `false` to skip initializing Mongoose.
    // If not `false`, the object must have properties `uri` and `options`
    // as described in the aforementioned Mongoose documentation.
    mongoose: false, /* {
      uri: 'mongodb://localhost/jscas',
      options: null
    } */

    // Set to `false` to skip initilizing a PostgreSQL database connection.
    // Otherwise, set to a configuration object compliant with the driver's
    // pool interface -- https://github.com/brianc/node-pg-pool#create .
    // If this is not set to `false`, you must also install the driver:
    // `npm install pg`.
    postgres: false /* {
      user: 'a-username',
      password: 'a-password',
      database: 'a-db-name'
    } */
  },

  // Iron settings for CSRF thwarting during login.
  loginCSRF: {
    ttl: 30 * 1000, // 30 seconds or some other sane value
    password: 'a really good password that is at least 32 characters'
  },

  plugins: {
    // At least one authentication plugin is required,
    // the first to validate wins.
    auth: [
      require('cas-server-auth-json')
    ],

    // only one ticket registry is allowed per server
    ticketRegistry: require('cas-server-pg-registries').ticketRegistry,

    // only one service registry is allowed per server
    serviceRegistry: require('cas-server-pg-registries').serviceRegistry,

    // If you need multiple themes, you should run multiple instances
    // and direct traffic to them through something like HAProxy.
    theme: require('cas-server-theme'),

    misc: []
  },

  // The `pluginsConf` key itself is required, but none of the child keys are
  // required (unless a plugin says otherwise). Thus, you can simplify this
  // to: `pluginsConf: {}`.
  pluginsConf: {
    // a basic authentication plugin that reads credentials from a JSON file
    // view the plugin's Readme.md for details on the file structure
    // the default configuration use's the plugin's sample data file
    authJSON: {
      // credentialStore: '/path/to/store.json'
    },

    // a ticket registry plugin backed by a PostgreSQL database
    mongoTicketRegistry: {},

    // a service registry plugin backed by a PostgreSQL database
    mongoServiceRegistry: {}
  }
}
