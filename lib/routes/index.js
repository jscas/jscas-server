'use strict'

const fs = require('fs')
const introduce = require('introduce')(__dirname)
const exclude = [
  'index.js',
  'objects'
]
let routes = []

for (const f of fs.readdirSync(__dirname)) {
  if (exclude.indexOf(f) > -1) {
    continue
  }
  routes = routes.concat(introduce(f))
}

module.exports = routes
