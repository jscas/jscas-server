'use strict'

const test = require('tap').test
const clone = require('clone')
const nock = require('nock')
const nullLogger = require('../../nullLogger')
const plugin = require('../../../lib/routes/logout')

const serverProto = {
  jscasPlugins: {
    theme: {},
    ticketRegistry: {}
  },
  jscasTGTCookie: 'tgt-cookie',
  jscasInterface: {},
  register (plugin) {},
  get (path, handler) {
    this.getHandler = handler
  }
}

test('returns logout view for missing tgt', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    logout () {
      return 'logout view'
    }
  }
  const req = {
    log: nullLogger,
    cookies: {},
    session: {}
  }
  const reply = {
    type (val) {
      t.is(val, 'text/html')
      return this
    },

    setCookie (name, val, options) {
      t.is(name, 'tgt-cookie')
      t.is(val, null)
      return this
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, reply)
    t.is(result, 'logout view')
  })
})

test('returns logout view for invalid service url', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    logout () {
      return 'logout view'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'invalid')
      return undefined
    }
  }
  const req = {
    log: nullLogger,
    cookies: {
      'tgt-cookie': '123456'
    },
    session: {},
    query: {
      service: 'invalid'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/html')
      return this
    },

    setCookie (name, val, options) {
      t.is(name, 'tgt-cookie')
      t.is(val, null)
      return this
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, reply)
    t.is(result, 'logout view')
    t.is(req.session.isAuthenticated, false)
  })
})

test('returns logout view for service retrieval exception', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    logout () {
      return 'logout view'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'invalid')
      throw Error('broken interface')
    }
  }
  const req = {
    log: nullLogger,
    cookies: {
      'tgt-cookie': '123456'
    },
    session: {},
    query: {
      service: 'invalid'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/html')
      return this
    },

    setCookie (name, val, options) {
      t.is(name, 'tgt-cookie')
      t.is(val, null)
      return this
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, reply)
    t.is(result, 'logout view')
    t.is(req.session.isAuthenticated, false)
  })
})

test('returns redirect for valid service url', (t) => {
  t.plan(7)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    logout () {
      return 'logout view'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url}
    }
  }
  const req = {
    log: nullLogger,
    cookies: {
      'tgt-cookie': '123456'
    },
    session: {},
    query: {
      service: 'http://example.com'
    }
  }
  const reply = {
    setCookie (name, val, options) {
      t.is(name, 'tgt-cookie')
      t.is(val, null)
      return this
    },

    redirect (code, url) {
      t.is(code, 303)
      t.is(url, 'http://example.com')
      return 'redirect'
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, reply)
    t.is(result, 'redirect')
    t.is(req.session.isAuthenticated, false)
  })
})

test('returns redirect for valid service url and sends slo reqs', (t) => {
  t.plan(10)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    logout () {
      return 'logout view'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url}
    }
  }
  server.jscasPlugins.ticketRegistry = {
    invalidateTGT: async function (tgtId) {
      t.is(tgtId, '123456')
    },

    servicesLogForTGT: async function (tgtId) {
      t.is(tgtId, '123456')
      return [{
        logoutUrl: 'http://example.com',
        serviceTicketId: '123456'
      }]
    }
  }
  const req = {
    log: nullLogger,
    cookies: {
      'tgt-cookie': '123456'
    },
    session: {},
    query: {
      service: 'http://example.com'
    }
  }
  const reply = {
    setCookie (name, val, options) {
      t.is(name, 'tgt-cookie')
      t.is(val, null)
      return this
    },

    redirect (code, url) {
      t.is(code, 303)
      t.is(url, 'http://example.com')
      return 'redirect'
    }
  }

  nock('http://example.com')
    .post('/', (body) => {
      t.match(body, /samlp:LogoutRequest/)
      return true
    })
    .reply(200)

  plugin(server, {}, async () => {
    const result = await server.getHandler(req, reply)
    t.is(result, 'redirect')
    t.is(req.session.isAuthenticated, false)
  })
})
