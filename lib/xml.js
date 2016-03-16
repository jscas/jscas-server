'use strict';

const laic = require('laic').laic.casServer;
const config = laic.get('config');
const marko = require('marko');
const markoCompiler = require('marko/compiler');

function getTemplate(name) {
  return marko.load(`${__dirname}/xmlTemplates/${name}.marko`);
}

const markoOptions = Object.assign(
  {
    writeToDisk: false,
    checkUpToDate: true
  },
  (config.server) ? config.server.marko || {} : {}
);
markoCompiler.defaultOptions.writeToDisk = markoOptions.writeToDisk;
markoCompiler.defaultOptions.checkUpToDate = markoOptions.checkUpToDate;

const validST = getTemplate('validST');
const invalidST = getTemplate('invalidST');

module.exports = {
  validST,
  invalidST
};
