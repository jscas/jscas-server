'use strict'

require('marko/node-require')
require('marko/compiler').defaultOptions.writeToDisk = false
const fs = require('fs')
const path = require('path')
const fp = require('fastify-plugin')
const merge = require('merge-options')

const siteLayout = require('./templates/site-layout')
const loginView = require('./templates/views/login')
const logoutView = require('./templates/views/logout')
const serverErrorView = require('./templates/views/serverError')
const successView = require('./templates/views/success')
const unauthorizedView = require('./templates/views/unauthorized')
const unknownServiceView = require('./templates/views/unknownService')

const origRender = siteLayout.renderToString.bind(siteLayout)
siteLayout.renderToString = function (context) {
  const _context = merge(
    {context: {isdebug: require('isdebug')}},
    context
  )
  return origRender(_context)
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

    serverError: function (context) {
      return siteLayout.renderToString({
        renderBody: serverErrorView,
        context
      })
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
  server.get('/basic/theme/shield.svg', function (req, reply) {
    const stream = fs.createReadStream(
      path.join(__dirname, 'assets', 'shield.svg')
    )
    reply.type('image/svg+xml').send(stream)
  })
  next()
})

module.exports.pluginName = 'basicTheme'
