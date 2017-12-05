'use strict'

const test = require('tap').test
const clear = require('clear-require')
const mockquire = require('mock-require')
const flushStream = require('flush-write-stream')
const configPath = require.resolve('../../lib/config')
const loggerPath = require.resolve('../../lib/logger')

test('logger factory works', (t) => {
  t.plan(2)

  const stream = flushStream((data, enc, cb) => {
    const obj = JSON.parse(data)
    t.is(obj.msg, 'hello')
    cb()
  })

  clear(loggerPath)
  mockquire(configPath, {
    get: () => {
      return {stream: stream}
    }
  })

  const log = require(loggerPath)()
  t.ok(log)
  log.info('hello')

  t.tearDown(() => mockquire.stopAll())
})

test('logger factory returns new instances', (t) => {
  t.plan(3)

  clear(loggerPath)
  mockquire(configPath, {
    get: () => {
      return {}
    }
  })

  const log1 = require(loggerPath)()
  const log2 = require(loggerPath)(true)

  t.ok(log1.info)
  t.ok(log2.info)
  t.notEqual(log1, log2)

  t.tearDown(() => mockquire.stopAll())
})

test('logger factory returns previous instances', (t) => {
  t.plan(3)

  clear(loggerPath)
  mockquire(configPath, {
    get: () => {
      return {}
    }
  })

  const log1 = require(loggerPath)()
  const log2 = require(loggerPath)(false)

  t.ok(log1.info)
  t.ok(log2.info)
  t.equal(log1, log2)

  t.tearDown(() => mockquire.stopAll())
})
