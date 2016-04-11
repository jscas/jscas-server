'use strict';

const fs = require('fs');
const path = require('path');
const introduce = require('introduce');
let routes = [];

// Because module.parent.filename within introduce will not
// resolve to this module's directory since this module was
// included from elsewhere.
const basedir = path.dirname(module.filename).split(path.sep).slice(-1)[0];

for (const f of fs.readdirSync(__dirname)) {
  if (f === 'index.js') {
    continue;
  }
  routes = routes.concat(introduce(basedir, f));
}

module.exports = routes;
