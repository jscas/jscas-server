'use strict'

const test = require('tap').test
const clone = require('clone')
const nullLogger = require('../../nullLogger')
const plugin = require('../../../lib/routes/slash')

const serverProto = {
  register (plugin) {},
  get (path, handler) {
    this.getHandler = handler
  }
}

test('returns /login redirect without query', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  const req = {
    log: nullLogger,
    urlData () {}
  }
  const reply = {
    redirect (code, path) {
      t.is(code, 302)
      t.is(path, '/login')
    }
  }

  plugin(server, {}, () => {
    server.getHandler(req, reply)
  })
})

test('returns /login redirect with query', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  const req = {
    log: nullLogger,
    urlData () {
      return 'a=b&c=d'
    }
  }
  const reply = {
    redirect (code, path) {
      t.is(code, 302)
      t.is(path, '/login?a=b&c=d')
    }
  }

  plugin(server, {}, () => {
    server.getHandler(req, reply)
  })
})
