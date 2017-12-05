'use strict'

const path = require('path')
const test = require('tap').test
const clear = require('clear-require')
const configPath = require.resolve('../../lib/config')

test('config loads defaults', (t) => {
  t.plan(2)
  clear.match(/nixconfig/)
  clear(configPath)
  const config = require(configPath)
  t.ok(config.config.logger)
  t.is(config.get('logger').prettyPrint, false)
})

test('config loads files', (t) => {
  t.plan(3)
  clear.match(/nixconfig/)
  clear(configPath)
  process.env['nixconfig_config_home'] = path.join(__dirname, 'mocks')
  const config = require(configPath)
  t.ok(config.config.logger)
  t.is(config.get('logger').prettyPrint, true)
  t.is(config.get('logger').level, 'debug')
})
