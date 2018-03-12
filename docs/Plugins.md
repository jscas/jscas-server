# Plugins API

*JSCAS* is designed to be modular. The server itself implements the most
basic functionality of the [CAS protocol][casp] and relies on a set of plugins
to handle the rest. Plugins fit within one of a few categories:

+ [`auth`](#auth-plugins): provides an object that can be used to validate
credentials (username and password)
+ [`misc`](#misc-plugins): provides various add-on functionality that isn't
necessarily specific to the CAS protocol
+ [`serviceRegistry`](#service-registry-plugins): provides functionality to
create, manage, and validate allowed services
+ [`theme`](#theme-plugins): provides templates for various parts of the user
interactive portions of the protocol (e.g. a login form)
+ [`ticketRegistry`](#ticket-registry-plugins): provides functionality to
create and validate tickets

Each *JSCAS* instance requires:

+ At *most* one `theme` plugin
+ At *most* one `ticketRegistry` plugin
+ At *most* one `serviceRegistry` plugin
+ At least one `auth` plugin

*JSCAS* plugins are actually [Fastify plugins][fastifyplugins] with an
additional requirement that the exported function include a `pluginName`
property. As an example, we might have the following `misc` type plugin:

```js
const fp = require('fastify-plugin')

function fooPlugin (server, options, next) {
  server.get('/some/new/endpoint', function (req, reply) {
    reply.send({success: true})
  })
  next()
}

module.exports = fp(fooPlugin)
module.exports.pluginName = 'foo'
```

This allows *JSCAS* plugins a vast amount of flexibility. We look forward
to seeing what you are able to do with this API. Read the following sections
for details on how to implement plugins of specific types within this
framework.

[casp]: https://github.com/apereo/cas/blob/1f3be83298/docs/cas-server-documentation/protocol/CAS-Protocol-Specification.md
[fastifyplugins]: https://www.fastify.io/docs/latest/Plugins/

<a id="auth-plugins"></a>
## `auth` Plugins

Authentication plugins require the registration of an object that contains
an asynchronous `validate` method; this object is called an "authenticator."
When a user attempts to authenticate, *JSCAS* will iterate all registered
authenticators until either one succeeds or all fail. If the credentials
supplied to the authenticator are valid, the authenticator must return `true`.
Otherwise it should return `false`. If an error occurs, it should be thrown.

Example:

```js
const fp = require('fastify-plugin')
module.exports = fp(function (server, options, next) {
  const authenticator = {
    validate: async function (username, password) {
      return username === 'foo' && password === 'bar'
    }
  }
  server.registerAuthenticator(authenticator)
  next()
})
module.exports.pluginName = 'foo-authenticator'
```

Note: thrown errors and `false` results are ignored. An `error` level log will
be registered for each failed authenticator, but no other action is taken.

Reference implementation: [/lib/plugins/jsIdP](/lib/plugins/jsIdP/index.js)

<a id="misc-plugins"></a>
## `misc` Plugins

Miscellaneous plugins are not directly used by *JSCAS*. They are merely a way
to register new functionality. These plugins have access to all of the normal
Fastify APIs, and the *JSCAS* specific plugin APIs.

To register a miscellaneous plugin invoke the
`server.registerMiscPlugin(obj)` method.

<a id="service-registry-plugins"></a>
## `serviceRegistry` Plugins

A service registry plugin is a vital part of the *JSCAS* server. Only one
service registry may be present. A service registry is an object with the
methods:

+ `async function close ()`: invoked on server shutdown to clean up any
connections established by the plugin.
+ `async function getServiceWithName (name)`: invoked by the server to retrieve
services based on their human readable name.
+ `async function getServiceWithUrl (url)`: invoked by the server to retrieve
services based on their registered URL.

A "service" is an object with properties:

+ `name` (string): a human readble name for the service.
+ `comment` (string): a human redable description for the service.
+ `url` (string): the URL the remote service will send as its callback URL.

To register a service registry invoke the
`server.registerServiceRegistry(registry)` method. For example:

```js
const fp = require('fastify-plugin')
module.exports = fp(function (server, options, next) {
  server.registerServiceRegistry({
    close: async function () {},
    getServiceWithName: async function (name) {
      return {name, comment: 'example', url: 'http://example.com/casauth'}
    },
    getServiceWithUrl: async function (url) {
      return {name: 'example', comment: 'example', url}
    }
  })
  next()
})
module.exports.pluginName = 'foo-service-registry'
```

Reference implementation: [/lib/plugins/jsServiceRegistry](/lib/plugins/jsServiceRegistry/index.js)

<a id="theme-plugins"></a>
## `theme` Plugins

*JSCAS* supports only one theme per instance, and a theme is required. The theme
is what provides templated HTML to users when they are interacting with the
server for authentication. A theme is an object with the following methods
that return an object compatible with Fastify's [send method][fastify-send]
(e.g. a string of HTML):

+ `function login (context)`: renders the login page. The `context` is an object
with at least a `csrfToken` property. It will typically also contain a `service`
property that represents the destination service URL. It may also contain an
`error` property that will be an instance of `Error` indicating something
went wrong with the previous login attempt.
+ `function logout ()`: shown to the user when they request the `/logout` endpoint.
+ `function noService ()`: shown to the user after a successful login when they
did not supply a destination service URL.
+ `function serverError (context)`: may be shown to the user upon a 5xx error.
The `context` is an object that may contain an `error` property that will be
an instance of `Error` indicating what went wrong.
+ `function unauthorized ()`: may be shown to the user when their ticket granting
ticket, or session, cannot be validated.
+ `function unknownService (serviceUrl)`: shown to the user if the service they
are attempting to authenticate to is not registered with the server. The
`serviceUrl` parameter will be a string representation of the requested
service URL.

To register a theme plugin invoke the `server.registerTheme(theme)` method.

Reference implementation: [/lib/plugins/basicTheme](/lib/plugins/basicTheme/index.js)

[fastify-send]: https://www.fastify.io/docs/latest/Reply/#send


<a id="ticket-registry-plugins"></a>
## `ticketRegistry` Plugins

A ticket registry plugin is a vital part of the *JSCAS* server. Only one
ticket registry may be present. A ticket registry is an object with the
methods:

+ `async function genST (tgtId, serviceId, expires)`: used to generate a new
service ticket for the `serviceId` (likely the service URL) that is tied to a
ticket granting ticket with id `tgtId`. The ticket will expire at the date and
time specified by `expires` (an instance of `Date`). The method should return
a new instance of a [service ticket](Tickets.md#serviceTicket).
+ `async function genTGT (userId, expires)`: used to generate a new [ticket
granting ticket](Tickets.md#ticketGrantingTicket) for the user with `userId`
(typically their username). The ticket will expire at the date and time
specified by `expires` (an instance of `Date`).
+ `async function getST (stId)`: retrieve a previously created service ticket
that has the given ticket id `stId`.
+ `async function getTGT (tgtId)`: retrieve a previously create ticket granting
ticket that has the given ticket id `tgtId`.
+ `async function getTGTbyST (stId)`: retrieve the ticket granting ticket that
was used to generate the service ticket identified by `stId`.
+ `async function invalidateST (stId)`: used to set the `valid` property of a
service ticket to `false`. It should return the newly invalidated service ticket.
+ `async function invalidateTGT (tgtId)`: used to set the `valid` property of a
ticket granting ticket to `false`. It may return the newly invalidated
ticket granting ticket.
+ `async function servicesLogForTGT (tgtId)`: used to get the list of services
that requested authorization against the ticket granting ticket identified by
`tgtId`. It should always return an `Array`.
+ `async function trackServiceLogin (st, tgt, serviceUrl)`: used to track a
service authorization using the given service ticket `st`, ticket granting
ticket `tgt` and service URL `serviceUrl`.

To register a ticket registry invoke the
`server.registerTicketRegistry(registry)` method. For example:

```js
const fp = require('fastify-plugin')
module.exports = fp(function (server, options, next) {
  server.registerTicketRegistry({
    genST: async function (tgtId, expires, serviceId) {},
    // ...
    // ...
    trackServiceLogin: async function (st, tgt, serviceUrl) {}
  })
  next()
})
module.exports.pluginName = 'foo-ticket-registry'
```

Reference implementation: [/lib/plugins/jsTicketRegistry](/lib/plugins/jsTicketRegistry/index.js)
