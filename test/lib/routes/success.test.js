'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/routes/success')

const serverProto = {
  jscasPlugins: {
    theme: {}
  },
  get (path, handler) {
    this.getHandler = handler
  }
}

test('returns the success page', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    noService () {
      return 'success page'
    }
  }
  const req = {}
  const reply = {
    send (html) {
      t.is(html, 'success page')
    }
  }
  plugin(server, {}, () => {
    server.getHandler(req, reply)
  })
})
