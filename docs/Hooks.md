# Hooks

Hooks are events within the various parts of the authorization lifecycle that
allow plugins to accomplish specific tasks. The currently provided hooks are
described in this document.

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
