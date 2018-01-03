# Configuration

*JSCAS* uses [nixconfig](https://npm.im/nixconfig) for loading configuration,
and it specifies the configuration name as `jscas`. Thus, a `jscas.js` or
`jscas.json` file within any of the following directories will be loaded:

+ `/etc`
+ `/etc/jscas`
+ `~`
+ `~/.jscas`
+ `~/.config/jscas`

It is also possible to set the environment variable `nixconfig_config_home`
to specify any other directory. This directory will be searched last, and the
configuration within it will take precedence.

<a id="default"></a>
## Default Configuration

The default configuration is viewable by reading
[/lib/config.js](/lib/config.js). The default configuration attempts to have
"sane" values. There are some values that *must* be adjusted for any install
to function properly, but a great deal of effort is made to keep this to
a minimum.

In particular, the server, and protocol itself, relies on cookies to function.
As a result, the most important configuration parameters deal with:

1. The cookie settings for the application to keep track of session data.
1. The cookie settings for the ticket granting ticket.

<a id="parameters"></a>
## Parameters

Each heading in this section is a property on a root configuration object.

<a id="logger"></a>
### `logger`

The `logger` configuration property configures the included
[Pino](https://npm.im/pino) instance. To learn about the available options,
read
[Pino's documentation](https://github.com/pinojs/pino/blob/49cb060f3f349bc90/docs/API.md#constructor).

<a id="server"></a>
### `server`

An object with the properties:

+ `address` (Default: `'127.0.0.1'`): the local IP address to bind to.
+ `port` (Default: `9000`): the local port to use for listening.

<a id="caching"></a>
### `caching`

*JSCAS* uses an internal cache for things such as session storage. It is
**important** that this configuration be updated to supply a proper backing
store. The default uses an in-memory store that should not be relied upon
in production.

This parameter accepts an object with the following properties:

+ `privacy` (Default: `'no-cache'`): any value that is valid for the
`Cache-control` header.
+ `cacheSegment` (Default: `'jscas'`): the namespace to store cache values
under.
+ `cache` (Default: an in-memory cache): This is an
[abstract-cache](https://www.npmjs.com/package/abstract-cache) configuration
object. An alternate `driver` should be specified to prevent the usage
of the in-memory storage.

<a id="data-sources"></a>
### `dataSources`

*JSCAS* makes various data sources available to registered plugins. The plugins
to be used will dictate this configuration parameter. The bundled demonstration
plugins do not require any data sources to be defined.

This parameter accepts an object with the following properties:

+ `mongodb`: configuration for the standard
[MongoDB client](http://mongodb.github.io/node-mongodb-native/3.0/reference/connecting/).
+ `postgres`: configuration for the standard
[pg module](https://node-postgres.com/features/connecting).
+ `redis`: configuration for the
[ioredis module](https://www.npmjs.com/package/ioredis#connect-to-redis).

<a id="cookie"></a>
### `cookie`

This parameter defines the settings that will be used when server sets
ticket granting ticket cookies. It is **important** this parameter be configured
properly.

This parameter accepts an object with the following properties:

+ `domain` (Default: `'.cas.example.com'`): this should be set to the *specific
domain* for the CAS server.
+ `path` (Default: `'/'`): this should be set to the base path for the CAS
server.
+ `expires` (Default: `1800000`): time, in milliseconds, that the cookie should
be valid. This time should be less than or equal to the cache lifetime.
+ `secure` (Default: `true`): specifies if the cookie should only be sent over
HTTPS connections.
+ `sameSite` (Default: `true`): dictates if the cookie is allowed to be sent
with cross site requests. See
[https://www.owasp.org/index.php/SameSite](https://www.owasp.org/index.php/SameSite).
+ `httpOnly` (Default: `true`): dictates if the cookie can be read by scripts
within a web page.

<a id="session"></a>
### `session`

This parameter defines the settings governing the session used by the server
to track users's authorization, and by plugins for various purposes.

The parameter accepts an object with the following properties:

+ `secretKey` (Default: **insecure**): it is **imperitive** this setting be
adjusted. It must be a string of at least 32 characters. This setting is used
to sign the session cookie.
+ `sessionMaxAge` (Default: `1800000`): time, in milliseconds, that the session
will be valid. This should be less than or equal to the
[cookie lifetime](#cookie) (typically equal).
+ `cookie`: the same possible settings as in [cookie](#cookie). It is
recommended that the values be the same as the [cookie](#cookie) configuration.

<a id="tickets"></a>
### `tickets`

This parameter defines settings for the various tickets that comprise the
CAS protocol.

This parameter accepts an object with the following properties:

+ `serviceTicket`: an object with the property `ttl` that defines the maximum
lifetime, in milliseconds, that a service ticket is valid. The default lifetime
is 10 seconds. This should be a very short time since a service ticket is only
valid for one service verification.
+ `ticketGrantingTicket`: an object with the properties `cookieName` and `ttl`
The `cookieName` defaults to `'jscas-tgt'`. The `ttl` defaults to `1800000`;
this is the time, in milliseconds, that the ticket granting ticket will be
valid. This should match the maximum age of the session.

<a id="v3overv2"></a>
### `v3overv2`

This parameter toggles the ability to serve CAS protocol version 3 attributes
to services via the CAS protocol version 2 endpoints. This parameter is a
boolean that defaults to `false`.

<a id="plugins"></a>
### `plugins`

This parameter defines the set of plugins that the server will use for various
functionalities. A basic set of plugins is required for the server to function
properly. Each value should be the name of a module that provides a
corresponding plugin. If the name begins with `~/`, then the plugin is loaded
from the server's `lib/plugins/` directory; this is only useful for the
bundled demonstration plugins.

This parameter accepts an object with the following properties:

+ `theme` (Default: `~/basicTheme`): name of the module that provides the
user interface. This is a **required** plugin.
+ `serviceRegistry` (Default: `~/jsServiceRegistry`): name of the module that
provides the service registry. This is a **required** plugin.
+ `ticketRegistry` (Default: `~/jsTicketRegistry`): name of the module that
provides the ticket registry. This is a **required** plugin.
+ `auth` (Default: `['~/jsIdP']`): this is an array of plugins that provide
authenticators. At least one authenticator is **required**.
+ `misc` (Default: `[]`): this is an array of plugins that provide
miscellaneous additional functionality. No plugins are required in this
category.

<a id="plugins-conf"></a>
### `pluginsConf`

This parameter defines the configuration for each of the supplied
[plugins](#plugins).

This parameter accepts an object with properties that are equal to the names
of the respective plugin they are for. As an example, if there is a
miscellaneous plugin with the name "foo" registered, this parameter may
look like:

```js
{
  foo: {
    option1: 'value',
    option2: 'value'
  }
}
```
