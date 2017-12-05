'use strict'

require('marko/node-require')
require('marko/compiler').defaultOptions.writeToDisk = false
const fp = require('fastify-plugin')
const isdebug = require('isdebug')
const merge = require('merge-options')

const siteLayout = require('./templates/site-layout')
const loginView = require('./templates/views/login')
const logoutView = require('./templates/views/logout')
const successView = require('./templates/views/success')
const unauthorizedView = require('./templates/views/unauthorized')
const unknownServiceView = require('./templates/views/unknownService')

const origStream = siteLayout.stream.bind(siteLayout)
siteLayout.stream = function (context) {
  const _context = merge(
    {context: {isdebug}},
    context
  )
  return origStream(_context)
}

module.exports = fp(function basicTheme (server, options, next) {
  const theme = {
    login: function (inputData) {
      return siteLayout.renderToString({
        renderBody: loginView,
        context: merge({}, inputData)
      })
    },

    logout: function () {
      return siteLayout.renderToString({
        renderBody: logoutView
      })
    },

    noService: function () {
      return siteLayout.renderToString({renderBody: successView})
    },

    unauthorized: function () {
      return siteLayout.renderToString({
        renderBody: unauthorizedView
      })
    },

    unknownService: function (serviceUrl) {
      return siteLayout.renderToString({
        renderBody: unknownServiceView,
        context: {serviceUrl}
      })
    }
  }
  server.registerTheme(theme)
  next()
})

module.exports.pluginName = 'basicTheme'
