'use strict'

const test = require('tap').test
const logger = require('abstract-logging')
const cheerio = require('cheerio')
const streamToString = require('./common/streamToString')

require('./common/setupIOC')()
const protocol3 = require('../lib/routes/protocol3')

test('validates service ticket in parameters', (t) => {
  t.plan(6)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    streamToString(response, (xml) => {
      const $ = cheerio.load(xml)
      const ele = $('cas\\:authenticationSuccess')
      t.equal(ele.length, 1)

      const user = $('cas\\:user', ele)
      t.equal(user.length, 1)
      t.equal(user.text(), 'fbar')

      const extras = $('cas\\:attributes', ele)
      t.equal(extras.length, 1)
      const username = $('cas\\:username', ele)
      t.equal(username.length, 1)
      t.equal(username.text(), 'fbar')
    })
  }

  protocol3[0].handler(request, reply)
})

test('validates service ticket in query', (t) => {
  t.plan(6)
  const request = {
    query: {
      service: 'http://example.com/',
      ticket: 'valid-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    streamToString(response, (xml) => {
      const $ = cheerio.load(xml)
      const ele = $('cas\\:authenticationSuccess')
      t.equal(ele.length, 1)

      const user = $('cas\\:user', ele)
      t.equal(user.length, 1)
      t.equal(user.text(), 'fbar')

      const extras = $('cas\\:attributes', ele)
      t.equal(extras.length, 1)
      const username = $('cas\\:username', ele)
      t.equal(username.length, 1)
      t.equal(username.text(), 'fbar')
    })
  }

  protocol3[0].handler(request, reply)
})

test('rejects bad service ticket', (t) => {
  t.plan(2)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'unknown'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    streamToString(response, (xml) => {
      const $ = cheerio.load(xml)
      const ele = $('cas\\:authenticationFailure')
      t.equal(ele.length, 1)
      t.equal(ele.attr('code'), 'INVALID_TICKET')
    })
  }

  protocol3[0].handler(request, reply)
})

test('rejects expired service ticket', (t) => {
  t.plan(2)
  const request = {
    params: {
      service: 'http://example.com/',
      ticket: 'expired-st'
    },
    method: 'get',
    logger
  }

  function reply (response) {
    streamToString(response, (xml) => {
      const $ = cheerio.load(xml)
      const ele = $('cas\\:authenticationFailure')
      t.equal(ele.length, 1)
      t.equal(ele.attr('code'), 'INVALID_TICKET')
    })
  }

  protocol3[0].handler(request, reply)
})
