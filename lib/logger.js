'use strict'

const pino = require('pino')

module.exports = function logger (config) {
  let conf = config || {}
  conf = (conf.hasOwnProperty('pino')) ? config.pino : {
    name: 'jscas-server',
    level: 'info'
  }
  let pretty
  if (conf.pretty) {
    pretty = pino.pretty()
    pretty.pipe(process.stdout)
  }
  return pino(conf, pretty)
}

module.exports['@requires'] = [ 'config' ]
module.exports['@singleton'] = true
