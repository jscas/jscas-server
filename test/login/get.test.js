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

function State () {
  function inner (cookieName, value) {
    inner[cookieName] = value
  }
  return inner
}

let loginToken
tap.beforeEach((done) => {
  Iron.seal({loginToken: '123456'}, config.loginCSRF.password, ironOptions, (err, sealed) => {
    if (err) return done(err)
    loginToken = sealed
    done()
  })
})

test('skips already authenticated sessions', (t) => {
  t.plan(4)
  const state = new State()
  state('test-cookie', 'valid-tgt')

  const request = {
    method: 'GET',
    query: {
      service: 'http://example.com/'
    },
    state: state,
    session: {
      isAuthenticated: true
    },
    logger
  }

  function reply () {
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

  loginRoutes[0].handler(request, reply)
})

test('reject authenticated session with expired ticket', (t) => {
  t.plan(2)
  const state = new State()
  state('test-cookie', 'expired-tgt')

  const request = {
    method: 'GET',
    query: {
      service: 'http://example.com/'
    },
    state: state,
    session: {
      isAuthenticated: true
    },
    logger
  }

  function reply (message) {
    t.equal(isPromise(message), true)
    return reply
  }

  reply.code = function code (num) {
    t.equal(num, 403)
  }

  loginRoutes[0].handler(request, reply)
})

test('initiates new logins', (t) => {
  t.plan(2)
  const state = new State()
  const request = {
    method: 'GET',
    state: state,
    query: {
      service: 'http://example.com/'
    },
    session: {
      isAuthenticated: false
    },
    logger
  }

  function reply (message) {
    t.equal(isPromise(message), true)
    message
      .then((html) => {
        t.equal(html, '<h1>login</h1>')
      })
      .catch((err) => t.threw(err))
  }

  loginRoutes[0].handler(request, reply)
})

test('forces login renewal', (t) => {
  t.plan(7)
  const state = new State()
  state('test-cookie', 'valid-tgt')

  const request = {
    method: 'get',
    state: state,
    query: {
      service: 'http://example.com/',
      renew: 'true'
    },
    session: {
      isAuthenticated: true
    },
    logger
  }

  function reply (message) {
    t.equal(isPromise(message), true)
    t.equal(request.session.renewal, true)
    message
      .then((html) => {
        t.equal(html, '<h1>login</h1>')
        const request2 = {
          method: 'POST',
          payload: {
            service: 'http://example.com/',
            username: 'fbar',
            password: '123456',
            loginToken
          },
          state: state,
          session: {
            isAuthenticated: true,
            loginToken: '123456',
            renewal: true
          },
          logger
        }

        const reply2 = function () { return reply2 }
        reply2.redirect = function redirect (dest) {
          t.equal(dest, 'http://example.com/?ticket=valid-st')
          return reply2
        }

        reply2.code = function code (num) {
          t.equal(num, 303)
          return reply2
        }

        reply2.state = function state (name, value) {
          t.equal(name, 'test-cookie')
          t.equal(value, 'valid-tgt')
        }
        loginRoutes[1].handler(request2, reply2)
      })
      .catch((err) => t.threw(err))
  }

  loginRoutes[0].handler(request, reply)
})
