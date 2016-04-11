'use strict';

const laic = require('laic').laic.casServer;
const config = laic.get('config');
const marko = laic.get('marko');

function getTemplate(name) {
  return marko.load(`${__dirname}/xmlTemplates/${name}.marko`);
}

const validST = getTemplate('validST');
const invalidST = getTemplate('invalidST');

module.exports = {
  validST,
  invalidST
};
