'use strict'

const test = require('tap').test
const clone = require('clone')
const nullLogger = require('../../nullLogger')
const plugin = require('../../../lib/routes/validate')

const serverProto = {
  jscasInterface: {},
  get (path, handler) {
    this.getHandler = handler
  }
}

test('returns no if no ticket is specified', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  const req = {
    log: nullLogger,
    query: {service: 'http://example.com'}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no if no service is specified', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  const req = {
    log: nullLogger,
    query: {ticket: '123456'}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for unknown service', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      return undefined
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for service lookup failure', (t) => {
  t.plan(2)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      throw Error('broken interface')
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for expired service ticket', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      return {name: 'foo', url: svc}
    },

    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: true}
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for service ticket lookup failure', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      return {name: 'foo', url: svc}
    },

    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('broken interface')
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for broken ticket invalidation', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      return {name: 'foo', url: svc}
    },

    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: false}
    },

    invalidateServiceTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('broken interface')
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns no for renewal with sso', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function () {
      t.fail('should not be invoked')
    },

    getServiceTicket: async function () {
      t.fail('should not be invoked')
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {
      isAuthenticated: true,
      renewal: true
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'no\n')
  })
})

test('returns yes successful validation', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (svc) {
      t.is(svc, 'http://example.com')
      return {name: 'foo', url: svc}
    },

    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: false}
    },

    invalidateServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: true}
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    },
    session: {}
  }
  plugin(server, {}, async () => {
    const result = await server.getHandler(req, {})
    t.is(result, 'yes\n')
  })
})
