'use strict'
/* eslint-env node, mocha */

const path = require('path')
const cheerio = require('cheerio')
const expect = require('chai').expect
const rimraf = require('rimraf')
require('./common/setupIOC')()

rimraf.sync(path.join(__dirname, '..', 'lib', 'xmlTemplats', '*.marko.js'))
const xml = require(path.join(__dirname, '..', 'lib', 'xml'))

suite('xml rendering', function () {
  test('invalid service ticket', function ist (done) {
    const html = xml.invalidST.renderSync({
      code: 42,
      message: 'no clue'
    })
    const $ = cheerio.load(html)
    const ele = $('cas\\:authenticationFailure')
    expect(ele.attr('code')).to.equal('42')
    expect(ele.text()).to.equal('no clue')
    done()
  })

  test('valid only username', function valuser (done) {
    const html = xml.validST.renderSync({ username: 'foo' })
    const $ = cheerio.load(html)
    expect($('cas\\:user').text()).to.equal('foo')
    done()
  })

  test('valid standard attributes', function stdattrs (done) {
    const html = xml.validST.renderSync({
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
    expect(authDate).to.be.an.instanceof(Date)
    expect($('cas\\:longTermAuthenticationRequestTokenUsed').text())
      .to.equal('true')
    expect($('cas\\:isFromNewLogin').text()).to.equal('true')

    const memberOf = $('cas\\:memberOf')
    expect(memberOf.length).to.equal(3)
    expect(memberOf[ 0 ].children[ 0 ].data).to.equal('one')
    expect(memberOf[ 1 ].children[ 0 ].data).to.equal('two')
    expect(memberOf[ 2 ].children[ 0 ].data).to.equal('three')
    done()
  })

  test('valid extra attributes', function stdattrs (done) {
    const html = xml.validST.renderSync({
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
    expect(authDate).to.be.an.instanceof(Date)
    expect($('cas\\:isFromNewLogin').length).to.equal(0)
    expect($('cas\\:foo').text()).to.equal('bar')

    const memberOf = $('cas\\:memberOf')
    expect(memberOf.length).to.equal(5)
    expect(memberOf[ 0 ].children[ 0 ].data).to.equal('one')
    expect(memberOf[ 1 ].children[ 0 ].data).to.equal('two')
    expect(memberOf[ 2 ].children[ 0 ].data).to.equal('three')
    expect(memberOf[ 3 ].children[ 0 ].data).to.equal('four')
    expect(memberOf[ 4 ].children[ 0 ].data).to.equal('five')
    done()
  })
})
