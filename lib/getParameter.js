'use strict';

module.exports = function getParameter(request, name) {
  let value = null;
  if (request.params && request.params[name]) {
    value = request.params[name];
  } else if (request.query && request.query[name]) {
    value = request.query[name];
  }
  return value;
};
