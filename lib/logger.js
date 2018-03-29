'use strict'

const pino = require('pino')
const config = require('./config')

let log
module.exports = function getLogger (newInstance) {
  if (log && !newInstance) return log
  log = pino(config.get('logger'), config.get('logger').stream)
  return log
}
