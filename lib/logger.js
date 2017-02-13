'use strict'

const pino = require('pino')

let logger
module.exports = function getLogger (config, newInstance) {
  if (logger && !newInstance) return logger
  const conf = (config && typeof config.hasOwnProperty === 'function' && config.hasOwnProperty('pino'))
    ? config.pino
    : {
      name: 'jscas-server',
      level: 'info'
    }
  logger = pino(conf)
  return logger
}
