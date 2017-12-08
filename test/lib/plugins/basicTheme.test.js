'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/basicTheme')

const serverProto = {
  jscasPlugins: {
    theme: {}
  },
  registerTheme (obj) {
    this.jscasPlugins.theme = obj
  }
}

test('returns basic login page', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.login({
      service: 'http://example.com',
      csrfToken: '123456'
    })
    t.match(html, /<strong>http:\/\/example\.com/)
    t.match(html, /value="123456">/)
    t.notMatch(html, /<h2>Uh oh/)
  })
})

test('returns basic login page without service', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.login({
      csrfToken: '123456'
    })
    t.notMatch(html, /<strong>http:\/\/example\.com/)
    t.match(html, /value="123456">/)
    t.notMatch(html, /<h2>Uh oh/)
  })
})

test('returns a login page with an error', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.login({
      service: 'http://example.com',
      csrfToken: '123456',
      error: Error('testing')
    })
    t.match(html, /<strong>http:\/\/example\.com/)
    t.match(html, /value="123456">/)
    t.match(html, /<h2>Uh oh/)
    t.match(html, /<p>testing/)
    t.notMatch(html, /<code><pre>/)
  })
})

test('returns a login page with an error and stack trace', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  process.env.DEBUG = 1
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.login({
      service: 'http://example.com',
      csrfToken: '123456',
      error: Error('testing')
    })
    t.match(html, /<strong>http:\/\/example\.com/)
    t.match(html, /value="123456">/)
    t.match(html, /<h2>Uh oh/)
    t.match(html, /<p>testing/)
    t.match(html, /<code><pre>/)
  })
  t.tearDown(() => delete process.env.DEBUG)
})

test('returns a logout page', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.logout()
    t.match(html, /Thank you for logging out/)
  })
})

test('returns a no service page', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.noService()
    t.match(html, /Thank you for logging in/)
  })
})

test('returns a server error page', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.serverError({
      error: Error('testing')
    })
    t.match(html, /<h2>Oops/)
    t.match(html, /Error message: testing/)
    t.notMatch(html, /<code><pre>/)
  })
})

test('returns a debug server error page', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  process.env.DEBUG = 1
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.serverError({
      error: Error('testing')
    })
    t.match(html, /<h2>Oops/)
    t.match(html, /Error message: testing/)
    t.match(html, /<code><pre>/)
  })
  t.tearDown(() => delete process.env.DEBUG)
})

test('returns an unauthorized page', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.unauthorized()
    t.match(html, /<h2>Sorry/)
  })
})

test('returns an unknown service page', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    const html = server.jscasPlugins.theme.unknownService('http://example.com')
    t.match(html, /<h2>Sorry/)
    t.match(html, /<code>http:\/\/example\.com/)
  })
})
