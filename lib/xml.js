'use strict';

const fs = require('fs');
const Handlebars = require('handlebars');

function getTemplate(name) {
  const buffer = fs.readFileSync(`${__dirname}/xmlTemplates/${name}.hbt`);
  return Handlebars.compile(buffer.toString());
}

const validST = getTemplate('validST');
const invalidST = getTemplate('invalidST');

module.exports = {
  validST,
  invalidST
};
