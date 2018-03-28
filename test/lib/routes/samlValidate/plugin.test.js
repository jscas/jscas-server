'use strict'

const fs = require('fs')
const path = require('path')
const test = require('tap').test
const clone = require('clone')
const nullLogger = require('../../../nullLogger')
const plugin = require('../../../../lib/routes/samlValidate')
const parseXml = require('../../../../lib/routes/samlValidate/contentTypeParser')
const validPostBody = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'valid-post-body.xml')
).toString()

const serverProto = {
  jscasInterface: {},
  jscasPlugins: {},
  parsers: {},
  plugins: [],
  req: {
    log: nullLogger
  },
  register (obj) {
    this.plugins.push(obj)
  },
  addContentTypeParser (type, options, parser) {
    this.parsers[type] = parser
  },
  post (path, handler) {
    const name = path.replace(/\//g, '')
    Object.assign(handler, this.req)
    this[name] = (req, reply, input) => {
      return new Promise((resolve, reject) => {
        parseXml(req, input, (err, parsed) => {
          if (err) return reject(err)
          const _req = Object.assign({body: parsed}, req, this.req)
          resolve(handler(_req, reply))
        })
      })
    }
  }
}

test('regiseters parser for all xml mimetypes', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    t.ok(server.parsers['application/xml'])
    t.ok(server.parsers['text/xml'])
    t.type(server.parsers['application/xml'], Function)
    t.type(server.parsers['text/xml'], Function)
  })
})

test('issues a valid response', (t) => {
  t.plan(13)
  const server = clone(serverProto)
  server.jscasPlugins.attributesResolver = {
    async attributesFor (userId) {
      t.is(userId, 'foo')
      return {
        memberOf: ['group1', 'group2'],
        sAMAccountName: 'foo'
      }
    }
  }
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {}
  }
  server.validateST = async function (tid) {
    t.is(tid, 'ST-1-u4hrm3td92cLxpCvrjylcas.example.com')
    return {}
  }
  server.invalidateST = async function (tid) {
    t.pass()
    return {}
  }
  server.getTGT = async function (stId) {
    t.pass()
    return {
      userId: 'foo'
    }
  }
  server.trackService = async function (st, tgt, serviceUrl) {
    t.pass()
    return {}
  }

  const req = {
    query: {
      TARGET: 'http://example.com'
    }
  }
  const reply = {
    type (input) {
      t.is(input, 'text/xml')
      return this
    }
  }

  plugin(server, {}, async () => {
    const response = await server.samlValidate(req, reply, validPostBody)
    t.ok(response)
    t.type(response, 'string')
    t.match(response, /AssertionID="[a-z0-9]+"/)
    t.match(response, /Audience>http:\/\/example\.com/)
    t.match(response, /group1/)
    t.match(response, /group2/)
  })
})

test('issues a invalid response when cannot find tgt', (t) => {
  t.plan(8)
  const server = clone(serverProto)
  server.jscasPlugins.attributesResolver = {
    async attributesFor (userId) {
      t.is(userId, 'foo')
      return {
        memberOf: ['group1', 'group2'],
        sAMAccountName: 'foo'
      }
    }
  }
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {}
  }
  server.validateST = async function (tid) {
    t.is(tid, 'ST-1-u4hrm3td92cLxpCvrjylcas.example.com')
    return {}
  }
  server.invalidateST = async function (tid) {
    t.pass()
    return {}
  }
  server.getTGT = async function (stId) {
    return {
      isError: true,
      message: 'to be caught'
    }
  }

  const req = {
    query: {
      TARGET: 'http://example.com'
    }
  }
  const reply = {
    type (input) {
      t.is(input, 'text/xml')
      return this
    }
  }

  plugin(server, {}, async () => {
    const response = await server.samlValidate(req, reply, validPostBody)
    t.ok(response)
    t.type(response, 'string')
    t.match(response, /saml1p:RequestDenied/)
    t.match(response, /could not be found/)
  })
})

test('issues a invalid response when cannot invalidate service ticket', (t) => {
  t.plan(7)
  const server = clone(serverProto)
  server.jscasPlugins.attributesResolver = {
    async attributesFor (userId) {
      t.is(userId, 'foo')
      return {
        memberOf: ['group1', 'group2'],
        sAMAccountName: 'foo'
      }
    }
  }
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {}
  }
  server.validateST = async function (tid) {
    t.is(tid, 'ST-1-u4hrm3td92cLxpCvrjylcas.example.com')
    return {}
  }
  server.invalidateST = async function (tid) {
    return {
      isError: true,
      message: 'to be caught'
    }
  }

  const req = {
    query: {
      TARGET: 'http://example.com'
    }
  }
  const reply = {
    type (input) {
      t.is(input, 'text/xml')
      return this
    }
  }

  plugin(server, {}, async () => {
    const response = await server.samlValidate(req, reply, validPostBody)
    t.ok(response)
    t.type(response, 'string')
    t.match(response, /saml1p:RequestDenied/)
    t.match(response, /validation failed/)
  })
})

test('issues a invalid response when cannot validate service', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.jscasPlugins.attributesResolver = {
    async attributesFor (userId) {
      t.is(userId, 'foo')
      return {
        memberOf: ['group1', 'group2'],
        sAMAccountName: 'foo'
      }
    }
  }
  server.validateService = async function (url) {
    t.is(url, 'http://example.com')
    return {}
  }
  server.validateST = async function (tid) {
    return {
      isError: true,
      message: 'to be caught'
    }
  }

  const req = {
    query: {
      TARGET: 'http://example.com'
    }
  }
  const reply = {
    type (input) {
      t.is(input, 'text/xml')
      return this
    }
  }

  plugin(server, {}, async () => {
    const response = await server.samlValidate(req, reply, validPostBody)
    t.ok(response)
    t.type(response, 'string')
    t.match(response, /saml1p:RequestDenied/)
    t.match(response, /was not recognized/)
  })
})
