'use strict'
/* eslint-env node, mocha */

const expect = require('chai').expect
const logger = require('abstract-logging')

require('./common/setupIOC')()
const logout = require('../lib/routes/logout')[0]

suite('Logout', function () {
  test('processes basic logout request', function basicLogout (done) {
    function state (cookieName, value) {
      state[cookieName] = value
    }
    state('test-cookie', 'valid-tgt')

    const request = {
      method: 'get',
      session: {
        isAuthenticated: true
      },
      state,
      logger
    }

    function reply (message) {
      expect(message).to.be.an.instanceof(Promise)
      message.then((html) => {
        expect(html).to.equal('<h1>logout</h1>')
        done()
      })
      return reply
    }

    reply.state = state

    logout.handler(request, reply)
  })

  test('sends redirect back to service if parameter present', function logoutRedirect (done) {
    function state (cookieName, value) {
      state[cookieName] = value
    }
    state('test-cookie', 'valid-tgt')

    const request = {
      method: 'get',
      session: {
        isAuthenticated: true
      },
      query: {
        service: 'http://example.com/'
      },
      state,
      logger
    }

    function reply () {
      return reply
    }

    reply.state = state

    reply.redirect = function (location) {
      expect(location).to.equal('http://example.com/')
      done()
    }

    logout.handler(request, reply)
  })
})
