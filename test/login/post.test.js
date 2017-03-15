'use strict'

const tap = require('tap')
const test = tap.test
const Iron = require('iron')
const isPromise = require('is-promise')
const logger = require('abstract-logging')

require('../common/setupIOC')()
const loginRoutes = require('../../lib/routes/login')

const config = require('../common/config')
const ironOptions = Iron.defaults
ironOptions.ttl = config.loginCSRF.ttl

let loginToken
tap.beforeEach((done) => {
  Iron.seal({loginToken: '123456'}, config.loginCSRF.password, ironOptions, (err, sealed) => {
    if (err) return done(err)
    loginToken = sealed
    done()
  })
})

test('rejects bad services', (t) => {
  t.plan(2)
  const request = {
    method: 'POST',
    payload: {
      service: 'http://bad.example.com/',
      username: 'fbar',
      password: '123456'
    },
    logger
  }

  function reply (message) {
    t.equal(isPromise(message), true)
    return reply
  }

  reply.code = function code (num) {
    t.equal(num, 500)
  }

  loginRoutes[1].handler(request, reply)
})

test('rejects bad login ticket', (t) => {
  t.plan(3)
  const request = {
    method: 'POST',
    payload: {
      service: 'http://example.com/',
      username: 'fbar',
      password: '123456',
      loginToken
    },
    session: {},
    logger
  }

  function reply () {
    return reply
  }

  reply.redirect = function redirect (dest) {
    t.equal(dest, '/login?service=' + encodeURIComponent(request.payload.service))
    t.ok(request.session.errorMessage)
    t.equal(request.session.errorMessage, 'invalid login token')
  }

  loginRoutes[1].handler(request, reply)
})

test('rejects invalid credentials', (t) => {
  t.plan(4)
  const request = {
    method: 'POST',
    payload: {
      service: 'http://example.com/',
      username: 'fbar',
      password: '213456',
      loginToken
    },
    session: {
      loginToken: '123456'
    },
    logger
  }

  function reply () {
    t.notOk(request.session.username)
    t.ok(request.session.errorMessage)
    t.equal(request.session.errorMessage, 'invalid credentials')
    return reply
  }

  reply.redirect = function redirect (dest) {
    t.equal(dest, '/login?service=' + encodeURIComponent(request.payload.service))
  }

  loginRoutes[1].handler(request, reply)
})

test('processes valid credentials', (t) => {
  t.plan(8)
  const request = {
    method: 'POST',
    payload: {
      service: 'http://example.com/',
      username: 'fbar',
      password: '123456',
      loginToken
    },
    session: {
      loginToken: '123456'
    },
    logger
  }

  function reply () {
    t.ok(request.session.username)
    t.equal(request.session.username, 'fbar')
    t.ok(request.session.isAuthenticated)
    t.equal(request.session.isAuthenticated, true)
    return reply
  }

  reply.redirect = function redirect (dest) {
    t.equal(dest, 'http://example.com/?ticket=valid-st')
    return reply
  }

  reply.code = function code (num) {
    t.equal(num, 303)
    return reply
  }

  reply.state = function state (name, value) {
    t.equal(name, 'test-cookie')
    t.equal(value, 'valid-tgt')
  }

  loginRoutes[1].handler(request, reply)
})
