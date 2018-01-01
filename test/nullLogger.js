'use strict'

const log = require('abstract-logging')
log.child = () => log
log.isLevelEnabled = () => true

module.exports = log
