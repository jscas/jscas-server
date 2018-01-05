#! /usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const options = require('getopts')(process.argv.slice(2), {
  alias: {
    h: 'help',
    s: 'sample-config'
  },
  boolean: [
    'help',
    'sample-config'
  ]
})

const help =
`
Starts the JSCAS web server.

Usage: jscas-server <options>

where <options> are:

  --help, -h:                 print this help message and quit
  --sample-config, -s:        dump an example server configuration, as YAML,
                              to stdout and quit
`

if (options.help) {
  console.log(help)
  process.exit(0)
}

if (options['sample-config']) {
  console.log(
    fs.readFileSync(path.join(__dirname, 'examples', 'production.yaml')).toString()
  )
  process.exit(0)
}

require('./server')
