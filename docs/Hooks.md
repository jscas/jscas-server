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
