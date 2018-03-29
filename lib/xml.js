'use strict'

const path = require('path')
const marko = require('marko')
require('marko/compiler').defaultOptions.writeToDisk = false

function getTemplate (name) {
  return marko.load(path.join(__dirname, 'xmlTemplates', `${name}.marko`))
}

const validST = getTemplate('validST')
const invalidST = getTemplate('invalidST')
const sloSaml = getTemplate('sloSaml')
const saml11Success = getTemplate('saml11Success')
const saml11Failure = getTemplate('saml11Failure')

module.exports = {
  validST,
  invalidST,
  sloSaml,
  saml11Success,
  saml11Failure
}
