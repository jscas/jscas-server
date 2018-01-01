<a id="api"></a>
# API

As mentioned in [Plugins](/docs/Plugins.md), the *JSCAS* server is an extensible
platform based upon the [Fastify](https://fastify.io/) framework. Plugins have
access to all of the normal *Fastify* API along with the additions outlined
herein.

<a id="decorations"></a>
## Decorations

<a id="pluginAPI"></a>
### Plugin API

Plugins are able to register themselves with the *JSCAS* server by using the
following methods:

+ `function registerAuthenticator (authenticator) {}`: adds an authenticator
object to the list of available authenticators.
+ `function registerHook (hookName, fn) {}`: adds a hook to be invoked during
certain operations. See the [Hooks](/docs/Hooks.md) document for more information.
+ `function registerMiscPlugin (obj) {}`: adds a miscellaneous functionality
plugin to the server.
+ `function registerServiceRegistry (registry) {}`: adds a service registry
object to the server.
+ `function registerTheme (theme) {}`: adds a user interface theme to the
the server.
+ `function registerTicketRegistry (registry) {}`: adds a ticket registry
object to the server.

Example:

```js
fastifyPlugin(function (server, options, done) {
  server.registerMiscPlugin({foo: 'bar'})
  done()
})
```

<a id="serverHooks"></a>
### `server.jscasHooks`

A hash of the hooks registered with the server. Each key is the name of the
hook, and each value is an array of items registered for that hook. See the
[Hooks](/docs/Hooks.md) document for the list of available hooks.

<a id="serverInterface"></a>
### `server.jscasInterface`

Provides access to an internal API object that abstracts the usage of the
service and ticket registries. This is useful when writing a custom
authentication endpoint. See the standard [login route](/lib/routes/login.js)
implementation for an example of its usage.

<a id="serverPlugins"></a>
### `server.jscasPlugins`

A hash of all registered plugins. The keys are a 1:1 mapping with the possible
[plugin types](/docs/Plugins.md). Each single valued plugin, e.g. `theme`,
directly resolves to the registered plugin. For multi-valued types, e.g. `auth`,
the value is an array of registered plugins.

<a id="serverTGTCookie"></a>
### `server.jscasTGTCookie`

The string name of the cookie used to store the
[Ticket Granting Ticket](/docs/Tickets.md#ticketGrantingTicket).

<a id="serverMongo"></a>
### `server.mongo`

When the server is configured to supply a MongoDB connection this property
returns that connection.

<a id="serverPostres"></a>
### `server.postgres`

When the server is configured to supply a PostgreSQL connection this property
returns that connection.

<a id="serverRedis"></a>
### `server.redis`

When the server is configured to supply a Redis connection this property
returns that connection.

<a id="csrfValiate"></a>
### `request.isValidCsrfToken`

A function, `function isValidCsrfToken (received) {}` that can be used to
validate the CSRF token available every request. See the
[CSRF API section](/docs/API.md#csrfAPI) for more information.

<a id="csrfSecret"></a>
### `request.session.csrfSecret`

A unique string, per session, used to generate CSRF tokens during the session.
See the [CSRF API section](/docs/API.md#csrfAPI) for more information.

<a id="csrfToken"></a>
### `request.session.csrfToken`

A unique string, per request, that can be used to validate payloads from
remote clients. See the [CSRF API section](/docs/API.md#csrfAPI) for more
information.

<a id="csrfAPI"></a>
## CSRF API

The *JSCAS* server includes a *Fastify* plugin that provides CSRF token
generation and validation for every request. For example, a plugin might do
something like the following:

```js
fastifyPlugin(function (server, options, done) {
  server.get('/foo/bar', function (req, reply) {
    reply.type('text/html')
    reply.send(`<input type="hidden" name="csrf" value="${req.session.csrfToken}">`)
  })

  server.post('/foo/bar', function (req, reply) {
    if (!req.isValidCsrfToken(req.body.csrf)) {
      return reply.code(403).send()
    }
    reply.send({success: true})
  })

  done()
})
```


