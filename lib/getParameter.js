'use strict'

module.exports = function getParameter (request, name) {
  let value = null
  if (request.params && request.params[name]) {
    value = request.params[name]
  } else if (request.query && request.query[name]) {
    value = request.query[name]
  } else if (request.payload && request.payload[name]) {
    value = request.payload[name]
  }
  return value
}
