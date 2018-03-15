'use strict'

const http = require('http')
const test = require('tap').test
const fastify = require('fastify')
const plugin = require('../../../lib/plugins/aliasParameters')

test('aliases TARGET to service', (t) => {
  t.plan(3)
  const server = fastify()
  t.tearDown(() => server.close())
  server
    .register(require('fastify-url-data'))
    .register(plugin)
    .get('/login', (req, reply) => {
      t.ok(req.query.service)
      t.ok(req.query.TARGET)
      t.is(req.query.service, req.query.TARGET)
      reply.send()
    })

  server.listen(0, (err) => {
    server.server.unref()
    if (err) t.threw(err)
    http.get(
      `http://localhost:${server.server.address().port}/login?TARGET=foobar`,
      () => {}
    )
  })
})
