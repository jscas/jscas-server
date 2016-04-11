'use strict';

const fs = require('fs');
const introduce = require('introduce');
let routes = [];

for (const f of fs.readdirSync(__dirname)) {
  if (f === 'index.js') {
    continue;
  }
  routes = routes.concat(introduce(f));
}

module.exports = routes;
