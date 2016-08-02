### 0.7.0
+ Update dependencies
  + knex is no longer a hard dependency
+ Add a CAS API object and switch to using it for processing logins

  The CAS API object abstracts interacting with the ticket and service
  registries. This will allow exposing the object to plugin authors so that
  they can implement custom login procedures. Currently the object is not
  exposed to plugins.

### 0.6.0
+ Update dependencies
+ Switch to using [Bluebird](http://bluebirdjs.com) for promises as
  a cheap way to optimize login operations

### 0.5.0
+ Update dependencies (node v6 will work)
+ Fix ST generation (send service name to registry)
+ Switch reference registries to MongoDB based implementation

### 0.4.0
+ Fix mongoose shutdown (make it exist)
+ Add a pre-authentication hook
+ Improve debug logging
+ Refine definition of ticket types in API documentation
+ Basic implementation of `/logout`
  + Reference implementation requires new versions of:
    + cas-server-db-schema (0.2.0)
    + cas-server-pg-service-registry (0.3.1)
    + cas-server-pg-ticket-registry (0.3.0)
    + cas-server-registries-db (0.3.0)
  + Does not support `url` or `service` parameters
  + Does not support client side SLO, only server-side

### 0.3.2
+ Fix broken log definition in error page handler

### 0.3.1
+ Remove unused hapi-boom-decorators dependency
+ Add catch all 4xx/5xx error pages

### 0.3.0
+ Drop `run` cli command. Only switches `--config` and `--settings`
  are available (they are aliases of each other)
+ Add templating engine [Marko][marko] to plugins phase one context
+ Add [Mongoose][mongoose] as a data source for plugins
+ Drop jshint for eslint. Clean up errors/warnings reported by eslint
+ Use [introduce][introduce] for loading internal modules in a cross
  platform manner
+ Allow authenticating without supplying a service
+ Clean up login processing code

[marko]: http://markojs.com/
[mongoose]: http://mongoosejs.com/
[introduce]: https://npmjs.com/introduce

### 0.2.0
+ Update dependencies
+ Switch logger to [pino][pino]
+ Update example configuration
+ Switch to [hapi-easy-session][hes] for session management
+ Add a `dataSources` property to plugins context. Initial data source available
  is [Knex][knex]
+ Simplify ticket lifetimes configuration

[pino]: https://www.npmjs.com/package/pino
[hes]: https://www.npmjs.com/package/hapi-easy-session
[knex]: http://knexjs.org/#Installation-client
