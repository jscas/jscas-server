'use strict'

const test = require('tap').test
const clone = require('clone')
const cheerio = require('cheerio')
const nullLogger = require('../../../nullLogger')
const plugin = require('../../../../lib/routes/serviceValidate')

const serverProto = {
  jscasInterface: {},
  jscasPlugins: {},
  req: {},
  register (obj) {},
  decorateRequest (name, val) {
    this.req[name] = val
  },
  get (path, handler) {
    const name = path.replace(/\//g, '')
    Object.assign(handler, this.req)
    this[name] = (req, reply) => {
      const _req = Object.assign({}, req, this.req)
      return handler(_req, reply)
    }
  }
}

test('returns invalid xml for unknown service', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'unknown')
    return {isError: true, message: 'unknown', code: 1}
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'unknown',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), '1')
    t.match(ele.text(), /Missing required/)
  })
})

test('returns invalid xml for unknown ticket id', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {name: 'foo', url}
  }
  server.validateST = async function (tid) {
    t.is(tid, '123456')
    return {isError: true, code: 1, message: 'invalid ticket'}
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), '1')
    t.match(ele.text(), /not recognized/)
  })
})

test('returns invalid xml for broken invalidation', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {name: 'foo', url}
  }
  server.validateST = async function (tid) {
    t.is(tid, '123456')
    return {tid}
  }
  server.invalidateST = async function (tid) {
    t.is(tid, '123456')
    return {isError: true, code: 1, message: 'broken interface'}
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), '1')
    t.match(ele.text(), /not be invalidated/)
  })
})

test('returns invalid xml for renewal via sso', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.fail('should not be invoked')
  }
  server.validateST = async function (tid) {
    t.fail('should not be invoked')
  }
  server.invalidateST = async function (tid) {
    t.fail('should not be invoked')
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456',
      renew: true
    },
    session: {
      isAuthenticated: true
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), 'INVALID_TICKET')
    t.match(ele.text(), /SSO login when renew/)
  })
})

test('returns invalid xml for broken tgt retrieval', (t) => {
  t.plan(7)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {name: 'foo', url}
  }
  server.validateST = async function (tid) {
    t.is(tid, '123456')
    return {tid}
  }
  server.invalidateST = async function (tid) {
    t.is(tid, '123456')
    return {tid, expired: false, valid: true}
  }
  server.getTGT = async function (tid) {
    t.is(tid, '123456')
    return {isError: true, code: 1, message: 'broken interface'}
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), '1')
    t.match(ele.text(), /not be found/)
  })
})

test('returns valid xml for success', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {name: 'foo', url}
  }
  server.validateST = async function (tid) {
    t.is(tid, '123456')
    return {tid}
  }
  server.invalidateST = async function (tid) {
    t.is(tid, '123456')
    return {tid, expired: false, valid: true}
  }
  server.getTGT = async function (tid) {
    t.is(tid, '123456')
    return {tid, userId: 'foo'}
  }
  server.trackService = async function () {}
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:user')
    t.is(ele.text(), 'foo')
  })
})

test('returns valid xml with attributes for v3-over-v2', (t) => {
  t.plan(10)
  const server = clone(serverProto)
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {name: 'foo', url}
  }
  server.validateST = async function (tid) {
    t.is(tid, '123456')
    return {tid}
  }
  server.invalidateST = async function (tid) {
    t.is(tid, '123456')
    return {tid, expired: false, valid: true}
  }
  server.getTGT = async function (tid) {
    t.is(tid, '123456')
    return {tid, userId: 'foo'}
  }
  server.trackService = async function () {}
  server.jscasPlugins.attributesResolver = {
    async attributesFor (id) {
      return {
        email: 'foo@example.com',
        memberOf: [
          'group1',
          'group2'
        ]
      }
    }
  }
  const req = {
    log: nullLogger,
    query: {
      service: 'http://example.com',
      ticket: '123456'
    }
  }
  const reply = {
    type (val) {
      t.is(val, 'text/xml')
    }
  }
  plugin(server, {useV3: true}, async () => {
    const xml = await server.serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:user')
    t.is(ele.text(), 'foo')

    const email = $('cas\\:email')
    t.is(email.text(), 'foo@example.com')

    const memberOf = $('cas\\:memberOf')
    t.is(memberOf.length, 2)
    t.is(memberOf[0].children[0].data, 'group1')
    t.is(memberOf[1].children[0].data, 'group2')
  })
})
