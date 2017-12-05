'use strict'

const test = require('tap').test
const clone = require('clone')
const plugin = require('../../../../lib/plugins/jsTicketRegistry')

const serverProto = {
  jscasPlugins: {
    ticketRegistry: {}
  },
  registerTicketRegistry (obj) {
    this.jscasPlugins.ticketRegistry = obj
  }
}

test('generates new ticket granting tickets', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const ticket = await server.jscasPlugins.ticketRegistry.genTGT('foo')
    t.type(ticket, Object)
    t.ok(ticket.userId)
    t.is(ticket.userId, 'foo')
    t.ok(ticket.tid)
    t.type(ticket.tid, 'string')
  })
})

test('returns existing ticket if not expired', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const ticket1 = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    setTimeout(() => {
      server.jscasPlugins.ticketRegistry.genTGT('foo')
        .then((ticket2) => {
          t.strictDeepEqual(ticket2, ticket1)
        })
        .catch(t.threw)
    }, 100)
  })
})

test('generates new ticket if expired ticket exists', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const ticket1 = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 100))
    setTimeout(() => {
      server.jscasPlugins.ticketRegistry.genTGT('foo')
        .then((ticket2) => {
          t.strictDeepInequal(ticket2.tid, ticket1.tid)
        })
        .catch(t.threw)
    }, 150)
  })
})
