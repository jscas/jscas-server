'use strict'

const test = require('tap').test
const clone = require('clone')
const cheerio = require('cheerio')
const nullLogger = require('../../../nullLogger')
const plugin = require('../../../../lib/routes/serviceValidate')

const serverProto = {
  jscasInterface: {},
  req: {},
  register (obj) {},
  decorateRequest (name, val) {
    this.req[name] = val
  },
  get (path, handler) {
    const name = path.replace(/\//g, '')
    this[name] = handler.bind(handler)
  }
}

// Note: most tests are covered by v2.test.js

test('returns invalid xml for unknown service', (t) => {
  t.plan(3)
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
  plugin(server, {}, async () => {
    const xml = await server.p3serviceValidate(req)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:authenticationFailure')
    t.is(ele.attr('code'), '1')
    t.match(ele.text(), /Missing required/)
  })
})

test('returns valid xml with attributes', (t) => {
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
  server.jscasHooks = {
    userAttributes: [async function (id) {
      return {
        email: 'foo@example.com',
        memberOf: [
          'group1',
          'group2'
        ]
      }
    }]
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
    const xml = await server.p3serviceValidate(req, reply)
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

test('returns valid xml with attributes for a singular memberOf value', (t) => {
  t.plan(9)
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
  server.jscasHooks = {
    userAttributes: [async function (id) {
      return {
        email: 'foo@example.com',
        memberOf: 'group1'
      }
    }]
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
    const xml = await server.p3serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:user')
    t.is(ele.text(), 'foo')

    const email = $('cas\\:email')
    t.is(email.text(), 'foo@example.com')

    const memberOf = $('cas\\:memberOf')
    t.is(memberOf.length, 1)
    t.is(memberOf[0].children[0].data, 'group1')
  })
})

test('merges data from multiple userAttributes hooks', (t) => {
  t.plan(13)
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
  server.jscasHooks = {
    userAttributes: [
      async function (id) {
        return {
          firstName: 'to_be_replaced',
          email: 'foo@example.com',
          memberOf: [
            'group1',
            'group2'
          ]
        }
      },
      async function (id) {
        return {
          firstName: 'Foo',
          lastName: 'Bar',
          memberOf: [
            'group2',
            'group3'
          ]
        }
      }
    ]
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
    const xml = await server.p3serviceValidate(req, reply)
    const $ = cheerio.load(xml)
    const ele = $('cas\\:user')
    t.is(ele.text(), 'foo')

    const email = $('cas\\:email')
    t.is(email.text(), 'foo@example.com')

    const firstName = $('cas\\:firstName')
    t.is(firstName.text(), 'Foo')

    const lastName = $('cas\\:lastName')
    t.is(lastName.text(), 'Bar')

    const memberOf = $('cas\\:memberOf')
    t.is(memberOf.length, 3)
    t.is(memberOf[0].children[0].data, 'group1')
    t.is(memberOf[1].children[0].data, 'group2')
    t.is(memberOf[2].children[0].data, 'group3')
  })
})
