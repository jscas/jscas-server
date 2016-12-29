# Logging Recommendations

*JSCAS* uses [pino][pino] as its logger. Further, [hapi-pino][hpino] is used
to log requests with a unique id so that it is easy to look at logs for a
specific request. The base logger is passed to all plugins during phase 1
initialization, as is described in the [Plugins documentation](Plugins.md).
The request specific logger is accessible via the request object in each
request handler function.

*JSCAS* itself logs almost everything at the `debug` level. Requests,
e.g. a `GET` request for `/login`, are logged at the `info` level. Other than
that, errors from exceptions are logged at the `error` level. Thus, on a
production server the only messages that should show up in logs are requests
and errors.

Given that information, it is **strongly recommended** that your plugins
follow these guidelines for logging:

+ use the base logger, i.e. the one passed in during phase 1, to log general
  debug messages
+ use the request logger to issue logs during requests
+ log all general messages at the `trace` level
+ log all error messages at the `error` level
+ log all error stack traces at the `debug` level
+ tag your logs with your plugin name.

When these guidelines are followed it will make debugging *JSCAS* itself easier,
while providing indication that a problem *might* be in a plugin (via the error
messages). For example, let's look at a plugin that provides a request handler:

```js
'use strict'

function routeHandler (request, reply) {
  request.log(['trace', 'fooPlugin'], 'handling /foo request')
  try {
    const result = someFunctionThatMightThrow(request.params.bar)
    reply(result)
  } catch (err) {
    request.log(['error', 'fooPlugin'], `/foo request failed: ${err.message}`)
    request.log(['debug', 'fooPlugin'], err.stack)
    reply().code(500)
  }
}

let log
module.exports.name = 'fooPlugin'
module.exports.plugin = function (conf, context) {
  log = context.logger.child({plugin: 'fooPlugin'})
  log.trace('plugin initializing')
  
  return Promise.resolve({})
}

module.exports.postInit = function (context) {
  log.trace('registering /foo handler')
  
  try {
    context.server.route({
      path: '/foo',
      method: 'GET',
      handler: routeHandler
    })
  } catch (err) {
    log.error('could not register /foo route: %s', err.message)
    log.debug(err.stack)
  }
  
  return Promise.resolve({})
}
````

[pino]: https://npmjs.com/pino
[hpino]: https://npmjs.com/hapi-pino


