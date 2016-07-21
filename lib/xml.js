'use strict'

const laic = require('laic').laic.casServer
const path = require('path')
const marko = laic.get('marko')

function getTemplate (name) {
  return marko.load(path.join(__dirname, 'xmlTemplates', `${name}.marko`))
}

const validST = getTemplate('validST')
const invalidST = getTemplate('invalidST')
const sloSaml = getTemplate('sloSaml')

module.exports = {
  validST,
  invalidST,
  sloSaml
}
