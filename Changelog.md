### 0.13.1
+ Fix bug that was preventing modules from loading correctly.

### 0.13.0
+ [breaking] Changes Pino configuration option `pretty` to `prettyPrint`.
 
  Pino now natively supports enabling pretty printing via the `prettyPrint`
  option being passed to its constructor. So we now directly use it.
+ Adds support for OpBeat instrumentation.

  The [OpBeat][opbeat] client has been integrated into the server.
  The integration is minimal; it does not directly send any errors to the
  service. This may change in later version. See the notes in
  `settings.example.js` and the Readme for more information.
  
  [opbeat]: https://opbeat.com/

### 0.12.1
+ Fix `package.json` so we can actually publish.

### 0.12.0
+ Update dependencies.
+ Add support for `renewal` parameter to `/login`.
+ Update usage of deprecated Marko template methods.
+ Migrate request logging to `request.logger` instead of `request.log`.

  This change is meant to improve performance. Using `request.log` meant we
  were waiting on Hapi and Pino to process tags. Also, we couldn't use format
  strings, e.g. `log('foo %s', 'bar')`. This meant unnecessary creation of
  strings from template strings.
+ Add support for `service` parameter on `/logout`. The server will redirect
  you back to the service if it matches a service URL in the service registry.

### 0.11.0
+ Update dependencies.
+ Add `hapi-pino` for request logging.
+ Add `md/Logging.md` doc to establish logging standard and update code accordingly.
+ Add API stablity notice to readme.
+ Add `Promise` object to plugin Phase 1 context.

  The `Promise` object is an instance of the [Bluebird][bluebird] promise
  library. The [bluebird-co][bbco] library is also added to the object. This
  allows plugin developers to use the same promise library as the server, and
  get some free coroutine handlers.
  
  Bluebird was chosen as an easy performance improvement since it is
  [faster than native promises][faster-promises].
+ Switch to [cas-server-pg-registries][pg-registries] as the default service
  and ticket registries.
  
  Upon speaking with @mcollina at Node Interactive 2016 (North America), it
  was decided to drop the MongoDB registries due to the way [Mongoose][mongoose]
  does some things. Specifically, it is really slow at merging document references.
  
  We had originally switched to the MongoDB registries to improve performance.
  This was because the original PostgreSQL registries were very slow. The issue
  with those registries is that they rely on the [Objection][objection] ORM.
  A combination of the natural slowness of ORMs and misunderstanding of the
  way Objection works led to the poor performance.
  
  The new PostgreSQL registries do not use any ORM. They directly query the
  database through hand crafted SQL statements. These registires should not
  pose a performance risk.
+ `postgres` data source added.
+ `knex` as a supported data source has been removed. It has been replaced
  with the `postgres` data source.
+ `settings.example.js` updated to reflect `postgres`, `knex`, and new registries.
+ {breaking} Ticket registry specification updated to require `getSTbyTGT` to
  return an array of results instead of the first match.
  
[bluebird]: http://bluebirdjs.com/docs/getting-started.html
[bbco]: https://www.npmjs.com/package/bluebird-co
[faster-promises]: http://bluebirdjs.com/docs/benchmarks.html
[pg-registries]: https://github.com/jscas/cas-server-pg-registries
[mongoose]: https://www.npmjs.com/package/mongoose
[objection]: https://www.npmjs.com/package/objection

### 0.10.1
+ Support authentication plugins returning a boolean instead of a rejection.

  The `jscas-ad-auth` plugin returns `false` on failure instead of throwing an
  error. This caused the server to accept garbage usernames.

### 0.10.0
+ Load datasources synchronously because some plugins may depend on the
  connections being established during phase 1

+ Remove Marko from the phase 1 context because Marko templates may not work
  if the module is not in the same path of the plugin that uses it. This can
  happen if configuration is in its own project outside of the `cas-server`
  project (installation)

### 0.9.0 
+ Migrate more functionality to `casInterface`

+ Update route loading to support Hapi 15

+ Update dependencies

+ Fix errors with expired state cookies in situations where the page should
  just load regardless of the old state

### 0.8.0
+ Update `preAuth` hook signature

  The `preAuth` hook signature was updated to accept a single parameter.
  The passed in parameter is an object with properties matching the original
  parameter list. However, the `loginTicket` property was removed and a
  `cas` object added (maps to the object defined in `lib/casInterface.js`).
  
  This change affects the `clearpass` plugin.
  
+ Removes support for login tickets

  The login ticket is an [optional part](https://github.com/apereo/cas/issues/1939)
  of the specification. Implementing them is too much of a burden and is more
  easily solved via a CSRF prevention token that doesn't require a ticket
  registry.
  
  This change affects theme and registry plugins.

+ New config block: `loginCSRF`

  The login form now uses a CSRF prevention token that isn't a login ticket.
  To support this, a new configuration block was added: `loginCSRF`. See
  `settings.example.js` for details.

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
