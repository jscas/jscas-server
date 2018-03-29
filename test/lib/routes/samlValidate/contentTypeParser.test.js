'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const test = require('tap').test
const parser = require('../../../../lib/routes/samlValidate/contentTypeParser')
const padding = crypto.randomBytes(32).toString('hex')

test('rejects bodies that are too short', (t) => {
  t.plan(3)
  parser(null, 'too short', (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.is(err.message, 'invalid xml')
  })
})

test('rejects unparseable xml', (t) => {
  t.plan(3)
  parser(null, `<foo><bar>${padding}</foo>`, (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.match(err, /Unexpected close tag/)
  })
})

test('rejects for missing envelope', (t) => {
  t.plan(3)
  parser(null, `<foo>${padding}</foo>`, (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.is(err.message, 'missing SOAP envelope')
  })
})

test('rejects for missing envelope body', (t) => {
  t.plan(3)
  parser(null, `<SOAP-ENV:Envelope>${padding}</SOAP-ENV:Envelope>`, (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.is(err.message, 'missing SOAP envelope body')
  })
})

test('rejects for missing samlp request', (t) => {
  t.plan(3)
  const xml = `
    <SOAP-ENV:Envelope>
      <SOAP-ENV:Body>${padding}</SOAP-ENV:Body>
    </SOAP-ENV:Envelope>
  `
  parser(null, xml, (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.is(err.message, 'missing SAMLP request')
  })
})

test('rejects for missing assertion', (t) => {
  t.plan(3)
  const xml = `
    <SOAP-ENV:Envelope>
      <SOAP-ENV:Body>
        <samlp:Request>${padding}</samlp:Request>
      </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>
  `
  parser(null, xml, (err, result) => {
    t.is(result, undefined)
    t.type(err, Error)
    t.is(err.message, 'missing assertion artifact')
  })
})

test('returns parsed xml payload object', (t) => {
  t.plan(2)
  const xml = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'valid-post-body.xml')
  )
  parser(null, xml, (err, result) => {
    t.error(err)
    t.strictDeepEqual(result, {
      id: '_192.168.16.51.1024506224022',
      issued: new Date('2002-06-19T17:03:44.022Z'),
      ticket: 'ST-1-u4hrm3td92cLxpCvrjylcas.example.com'
    })
  })
})
