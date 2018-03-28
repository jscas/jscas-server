'use strict'

const UidGenerator = require('uid-generator')
const fp = require('fastify-plugin')
const uidgen = new UidGenerator()
const hookIdSym = Symbol('jscas-hook-id')

function registerAuthenticator (authenticator) {
  this.jscasPlugins.auth.push(authenticator)
  return this
}

function registerAttributeResolver (resolver) {
  this.jscasPlugins.attributeResolver = resolver
}

function registerHook (hookName, fn) {
  if (!this.jscasHooks[hookName]) return this
  fn[hookIdSym] = uidgen.generateSync()
  this.jscasHooks[hookName].push(fn)
  return this
}

function registerMiscPlugin (obj) {
  this.jscasPlugins.misc.push(obj)
  return this
}

function registerServiceRegistry (registry) {
  this.jscasPlugins.serviceRegistry = registry
  return this
}

function registerTheme (theme) {
  this.jscasPlugins.theme = theme
  return this
}

function registerTicketRegistry (registry) {
  this.jscasPlugins.ticketRegistry = registry
  return this
}

module.exports = fp(function pluginApiPlugin (instance, opts, next) {
  instance.decorate('registerAuthenticator', registerAuthenticator)
  instance.decorate('registerAttributeResolver', registerAttributeResolver)
  instance.decorate('registerHook', registerHook)
  instance.decorate('registerMiscPlugin', registerMiscPlugin)
  instance.decorate('registerServiceRegistry', registerServiceRegistry)
  instance.decorate('registerTheme', registerTheme)
  instance.decorate('registerTicketRegistry', registerTicketRegistry)
  next()
})
