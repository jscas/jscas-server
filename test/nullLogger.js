'use strict'

const log = require('abstract-logging')
log.child = () => log

module.exports = log
