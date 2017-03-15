'use strict'

const test = require('tap').test
const path = require('path')
const cheerio = require('cheerio')
const rimraf = require('rimraf')
require('./common/setupIOC')()

rimraf.sync(path.join(__dirname, '..', 'lib', 'xmlTemplats', '*.marko.js'))
const xml = require(path.join(__dirname, '..', 'lib', 'xml'))

test('invalid service ticket', (t) => {
  t.plan(2)
  const html = xml.invalidST.renderToString({
    code: 42,
    message: 'no clue'
  })
  const $ = cheerio.load(html)
  const ele = $('cas\\:authenticationFailure')
  t.equal(ele.attr('code'), '42')
  t.equal(ele.text(), 'no clue')
})

test('valid only username', (t) => {
  t.plan(1)
  const html = xml.validST.renderToString({ username: 'foo' })
  const $ = cheerio.load(html)
  t.equal($('cas\\:user').text(), 'foo')
})

test('valid standard attributes', (t) => {
  t.plan(7)
  const html = xml.validST.renderToString({
    username: 'foo',
    attributes: {
      standardAttributes: {
        authenticationDate: new Date('2016-03-16T15:00:00-05:00'),
        longTermAuthenticationRequestTokenUsed: true,
        isFromNewLogin: true,
        memberOf: [ 'one', 'two', 'three' ]
      }
    }
  })
  const $ = cheerio.load(html)

  const authDate = new Date($('cas\\:authenticationDate').text())
  t.type(authDate, Date)
  t.equal($('cas\\:longTermAuthenticationRequestTokenUsed').text(), 'true')
  t.equal($('cas\\:isFromNewLogin').text(), 'true')

  const memberOf = $('cas\\:memberOf')
  t.equal(memberOf.length, 3)
  t.equal(memberOf[0].children[0].data, 'one')
  t.equal(memberOf[1].children[0].data, 'two')
  t.equal(memberOf[2].children[0].data, 'three')
})

test('valid extra attributes', (t) => {
  t.plan(9)
  const html = xml.validST.renderToString({
    username: 'foo',
    attributes: {
      standardAttributes: {
        authenticationDate: new Date('2016-03-16T15:00:00-05:00'),
        memberOf: [ 'one', 'two', 'three' ]
      },
      extraAttributes: {
        foo: 'bar',
        memberOf: [ 'four', 'five' ]
      }
    }
  })
  const $ = cheerio.load(html)

  const authDate = new Date($('cas\\:authenticationDate').text())
  t.type(authDate, Date)
  t.equal($('cas\\:isFromNewLogin').length, 0)
  t.equal($('cas\\:foo').text(), 'bar')

  const memberOf = $('cas\\:memberOf')
  t.equal(memberOf.length, 5)
  t.equal(memberOf[0].children[0].data, 'one')
  t.equal(memberOf[1].children[0].data, 'two')
  t.equal(memberOf[2].children[0].data, 'three')
  t.equal(memberOf[3].children[0].data, 'four')
  t.equal(memberOf[4].children[0].data, 'five')
})
