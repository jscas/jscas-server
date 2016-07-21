'use strict'

module.exports.name = 'mockTheme'

module.exports.plugin = function mockTheme (config, context) {
  return {
    internalError (context) {
      return Promise.resolve('<h1>error</h1>')
    },

    login (context) {
      return Promise.resolve('<h1>login</h1>')
    },

    loginRedirect (context) {
      return Promise.resolve('<h1>redirect</h1>')
    },

    logout (context) {
      return Promise.resolve('<h1>logout</h1>')
    },

    noService (context) {
      return Promise.resolve('<h1>no-service</h1>')
    },

    unauthorized (context) {
      return Promise.resolve('<h1>unauthorized</h1>')
    }
  }
}
