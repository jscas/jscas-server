<a id="hooks"></a>
# Hooks

Hooks are events within the various parts of the authorization lifecycle that
allow plugins to accomplish specific tasks. The currently provided hooks are
described in this document.

<a id="hooks-preauth"></a>
## preAuth

Registered `preAuth` hooks are iterated prior to validating a submitted
username and password credentials pair during the normal login procedure. Other
login mechanisms may or may not support this hook.

This hook expects an asynchronous function with the signature:
`async function hook (context) {}`. The hook should throw on a fatal error,
which will be logged at the error level and ignored. Otherwise, it should
return `true`. The provided context object has the properties:

+ `username`: string representing the login id of the client
+ `password`: string representing the client's secret credential
+ `serviceUrl`: string representing the service the client is attempting to access
+ `session`: an object that provides a unique session tied to the client and hook

Example:

```js
const fp = require('fastify-plugin')
module.exports = fp(function (server, options, next) {
  server.registerHook('preAuth', async function ({username, password, serviceUrl, session}) {
    if (serviceUrl === 'http://example.com') {
      server.log.info('User `%s` is accessing service: %s', username, serviceUrl)
      session.count = (session.count) ? session.count + 1 : 1
    }
    return true
  })
  next()
})
module.exports.pluginName = 'misc-preAuth-plugin'
```

<a id="hooks-userattrs"></a>
## userAttributes

Registered `userAttributes` hooks are iterated upon successful service ticket
validation when the validation is done via protocol version 3 (or version 3
over version 2). A `userAttributes` hook returns a hash of details about a
given user, e.g. their email address or the groups they belong to.

Each registered hook is iterated in order of registration. Information from
subsequent hooks will be merged into the information of the previous hook. This
merge is superficially deep. This means `{foo: 'bar', baz: [{foo: 'bar'}]}` and
`{foo: 'foobar', baz:[{foo: 'foo'}]}` will be merged into
`{foo: 'foobar', baz: [{foo: 'bar'}, {foo: 'foo'}]}`.

Example:

```js
const fp = require('fastify-plugin')
module.exports = fp(function (server, options, next) {
  const attrs: {
    attribute1: 'example attribute'
  }
  server.registerHook('userAttributes', async function (userId) {
    if (userId === 'foo') return attrs
    return undefined
  })
  next()
})
module.exports.pluginName = 'misc-attributes-plugin'
```

Notice that:

1. The example is implemented as a [misc plugin](/docs/Plugins.md#misc-plugins)
type. Typically, this hook would be registered in an
[auth plugin](/docs/Plugins.md#auth-plugins). We have used the misc type here
for simplicity.
1. The registered hook is an asynchronous function that accepts a user
identifier.

Given the above example, when the user "foo" requests validation via service
"bar" the resulting success payload sent to the service will include:

```xml
<cas:attributes>
  <cas:attribute1>example attribute</cas:attribute1>
</cas:attributes>
```

The CAS protocol defines a standard `memberOf` attribute for listing the
groups a user is a member of. To provide a value for this attribute, return
an object like:

```js
{
  memberOf: [
    'group1',
    'group2'
  ]
}
```

Addtionally, any array valued attribute will be serialized to an xml array
appropriately.
