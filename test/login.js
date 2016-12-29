'use strict'
/* eslint-env node, mocha */

const Iron = require('iron')
const isPromise = require('is-promise')
const expect = require('chai').expect

require('./common/setupIOC')()
const loginRoutes = require('../lib/routes/login')

const config = require('./common/config')
const ironOptions = Iron.defaults
ironOptions.ttl = config.loginCSRF.ttl

function noop () {}

function State () {
  function inner (cookieName, value) {
    inner[cookieName] = value
  }
  return inner
}

suite('Login GET method', function () {
  test('skips already authenticated sessions', function skipAuth (done) {
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
      log: noop
    }

    function reply () {
      return reply
    }

    reply.redirect = function redirect (dest) {
      expect(dest).to.equal('http://example.com/?ticket=valid-st')
      return reply
    }

    reply.code = function code (num) {
      expect(num).to.equal(303)
      return reply
    }

    reply.state = function state (name, value) {
      expect(name).to.equal('test-cookie')
      expect(value).to.equal('valid-tgt')
      done()
    }

    loginRoutes[ 0 ].handler(request, reply)
  })

  test('reject authenticated session with expired ticket', function expired (done) {
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
      log: noop
    }

    function reply (message) {
      expect(isPromise(message)).to.be.true
      return reply
    }

    reply.code = function code (num) {
      expect(num).to.equal(403)
      done()
    }

    loginRoutes[ 0 ].handler(request, reply)
  })

  test('initiates new logins', function newLogin (done) {
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
      log: noop
    }

    function reply (message) {
      expect(isPromise(message)).to.be.true
      message.then((html) => {
        expect(html).to.equal('<h1>login</h1>')
        done()
      })
    }

    loginRoutes[ 0 ].handler(request, reply)
  })

// TODO: renewal isn't really implemented yet
  test('forces login renewal', function renewal (done) {
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
      log: noop
    }

    function reply () {
      return reply
    }

    reply.redirect = function redirect (dest) {
      expect(dest).to.equal('http://example.com/?ticket=valid-st')
      return reply
    }

    reply.code = function code (num) {
      expect(num).to.equal(303)
      return reply
    }

    reply.state = function state (name, value) {
      expect(name).to.equal('test-cookie')
      expect(value).to.equal('valid-tgt')
      done()
    }

    loginRoutes[ 0 ].handler(request, reply)
  })
})

suite('Login POST method', function () {
  let loginToken
  suiteSetup((done) => {
    Iron.seal({loginToken: '123456'}, config.loginCSRF.password, ironOptions, (err, sealed) => {
      if (err) return done(err)
      loginToken = sealed
      done()
    })
  })

  test('rejects bad services', function postBad (done) {
    const request = {
      method: 'POST',
      payload: {
        service: 'http://bad.example.com/',
        username: 'fbar',
        password: '123456'
      },
      log: noop
    }

    function reply (message) {
      expect(isPromise(message)).to.be.true
      return reply
    }

    reply.code = function code (num) {
      expect(num).to.equal(500)
      done()
    }

    loginRoutes[ 1 ].handler(request, reply)
  })

  test('rejects bad login ticket', function postBad (done) {
    const request = {
      method: 'POST',
      payload: {
        service: 'http://example.com/',
        username: 'fbar',
        password: '123456',
        loginToken
      },
      session: {},
      log: noop
    }

    function reply () {
      return reply
    }

    reply.redirect = function redirect (dest) {
      expect(dest).to.equal(
        '/login?service=' + encodeURIComponent(request.payload.service)
      )
      expect(request.session.errorMessage).to.exist
      expect(request.session.errorMessage).to.equal('invalid login token')
      done()
    }

    loginRoutes[ 1 ].handler(request, reply)
  })

  test('rejects invalid credentials', function validLogin (done) {
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
      log: noop
    }

    function reply () {
      expect(request.session.username).to.not.exist
      expect(request.session.errorMessage).to.exist
      expect(request.session.errorMessage).to.equal('invalid credentials')
      return reply
    }

    reply.redirect = function redirect (dest) {
      expect(dest).to.equal(
        '/login?service=' + encodeURIComponent(request.payload.service)
      )
      done()
    }

    loginRoutes[ 1 ].handler(request, reply)
  })

  test('processes valid credentials', function validLogin (done) {
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
      log: noop
    }

    function reply () {
      expect(request.session.username).to.exist
      expect(request.session.username).to.equal('fbar')
      expect(request.session.isAuthenticated).to.exist
      expect(request.session.isAuthenticated).to.be.true
      return reply
    }

    reply.redirect = function redirect (dest) {
      expect(dest).to.equal('http://example.com/?ticket=valid-st')
      return reply
    }

    reply.code = function code (num) {
      expect(num).to.equal(303)
      return reply
    }

    reply.state = function state (name, value) {
      expect(name).to.equal('test-cookie')
      expect(value).to.equal('valid-tgt')
      done()
    }

    loginRoutes[ 1 ].handler(request, reply)
  })
})
