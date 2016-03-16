'use strict';

const fs = require('fs');
const marko = require('marko');

function getTemplate(name) {
  return marko.load(`${__dirname}/xmlTemplates/${name}.marko`);
}

const validST = getTemplate('validST');
const invalidST = getTemplate('invalidST');

module.exports = {
  validST,
  invalidST
};
