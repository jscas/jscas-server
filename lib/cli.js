'use strict'

const nopt = require('nopt')

const knownOptions = {
  config: [String],
  settings: [String]
}

const shortHands = {
  c: ['--config'],
  s: ['--settings']
}

module.exports = nopt(knownOptions, shortHands)
