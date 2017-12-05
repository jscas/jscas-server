'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../lib/plugins/ticketUtils')

const serverProto = {
  jscasInterface: {},
  decorate (name, obj) {
    this[name] = obj
  }
}

test('validateService returns error for unknown service', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'unknown')
      return undefined
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateService('unknown')
    t.ok(result.isError)
    t.is(result.code, 'INVALID_SERVICE')
    t.match(result, /not recognized/)
  })
})

test('validateService returns error for exception', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'unknown')
      throw Error('broken interface')
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateService('unknown')
    t.ok(result.isError)
    t.is(result.code, 'INTERNAL_ERROR')
    t.match(result, /broken interface/)
  })
})

test('validateService returns service for success', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url}
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateService('http://example.com')
    t.notOk(result.isError)
    t.strictDeepEqual(result, {name: 'foo', url: 'http://example.com'})
  })
})

test('validateST returns error for expired ticket', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: true, valid: true}
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateST('123456')
    t.ok(result.isError)
    t.is(result.code, 'INVALID_TICKET')
    t.match(result, /ticket expired/)
  })
})

test('validateST returns error for exception', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('broken interface')
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateST('123456')
    t.ok(result.isError)
    t.is(result.code, 'INVALID_TICKET')
    t.match(result, /broken interface/)
  })
})

test('validateST returns service ticket for success', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    getServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: false, valid: true}
    }
  }
  plugin(server, {}, async () => {
    const result = await server.validateST('123456')
    t.notOk(result.isError)
    t.strictDeepEqual(result, {tid: '123456', expired: false, valid: true})
  })
})

test('invalidateST returns error for exception', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    invalidateServiceTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('broken interface')
    }
  }
  plugin(server, {}, async () => {
    const result = await server.invalidateST('123456')
    t.ok(result.isError)
    t.is(result.code, 'INTERNAL_ERROR')
    t.match(result, /broken interface/)
  })
})

test('invalidateST returns service ticket for success', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    invalidateServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid, expired: false, valid: false}
    }
  }
  plugin(server, {}, async () => {
    const result = await server.invalidateST('123456')
    t.notOk(result.isError)
    t.strictDeepEqual(result, {tid: '123456', expired: false, valid: false})
  })
})

test('getTGT returns error for exception', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    getTicketGrantingTicketByServiceTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('broken interface')
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getTGT('123456')
    t.ok(result.isError)
    t.is(result.code, 'INVALID_TICKET')
    t.match(result, /broken interface/)
  })
})

test('getTGT returns ticket for success', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.jscasInterface = {
    getTicketGrantingTicketByServiceTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid}
    }
  }
  plugin(server, {}, async () => {
    const result = await server.getTGT('123456')
    t.notOk(result.isError)
    t.strictDeepEqual(result, {tid: '123456'})
  })
})

test('trackService returns true on exception', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    trackServiceLogin: async function (st, tgt, service) {
      t.strictDeepEqual(st, {tid: '123456', expired: false, valid: false})
      t.strictDeepEqual(tgt, {tid: '123456'})
      t.strictDeepEqual(service, {name: 'foo', url: 'http://example.com'})
      throw Error('broken interface')
    }
  }
  plugin(server, {}, async () => {
    const st = {tid: '123456', expired: false, valid: false}
    const tgt = {tid: '123456'}
    const service = {name: 'foo', url: 'http://example.com'}
    const result = await server.trackService(st, tgt, service)
    t.is(result, true)
  })
})

test('trackService returns true on success', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasInterface = {
    trackServiceLogin: async function (st, tgt, service) {
      t.strictDeepEqual(st, {tid: '123456', expired: false, valid: false})
      t.strictDeepEqual(tgt, {tid: '123456'})
      t.strictDeepEqual(service, {name: 'foo', url: 'http://example.com'})
      return true
    }
  }
  plugin(server, {}, async () => {
    const st = {tid: '123456', expired: false, valid: false}
    const tgt = {tid: '123456'}
    const service = {name: 'foo', url: 'http://example.com'}
    const result = await server.trackService(st, tgt, service)
    t.is(result, true)
  })
})
