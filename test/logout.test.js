'use strict'

const test = require('tap').test
const isPromise = require('is-promise')
const logger = require('abstract-logging')

require('./common/setupIOC')()
const logout = require('../lib/routes/logout')[0]

test('processes basic logout request', (t) => {
  t.plan(2)
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
    t.equal(isPromise(message), true)
    message
      .then((html) => {
        t.equal(html, '<h1>logout</h1>')
      })
      .catch((err) => t.threw(err))
    return reply
  }

  reply.state = state

  logout.handler(request, reply)
})

test('sends redirect back to service if parameter present', (t) => {
  t.plan(1)
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
    t.equal(location, 'http://example.com/')
  }

  logout.handler(request, reply)
})
