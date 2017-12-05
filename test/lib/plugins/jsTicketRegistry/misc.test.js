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

test('close returns true', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    t.is(await server.jscasPlugins.ticketRegistry.close(), true)
  })
})

test('gets ticket granting ticket by service ticket id', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt1 = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    const st1 = await server.jscasPlugins.ticketRegistry.genST(tgt1.tid, new Date(), 'fooservice')
    const tgt2 = await server.jscasPlugins.ticketRegistry.getTGTbyST(st1.tid)
    t.is(tgt1, tgt2)
  })
})

test('get ticket granting ticket by service ticket id throws for bad id', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    // Add a ticket just so there is something to iterate.
    await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    t.rejects(server.jscasPlugins.ticketRegistry.getTGTbyST.bind('123456'))
  })
})

test('service login tracking works', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    const st = await server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(), 'fooservice')
    await server.jscasPlugins.ticketRegistry.trackServiceLogin(st, tgt, 'http://example.com')
    const services = await server.jscasPlugins.ticketRegistry.servicesLogForTGT(tgt.tid)
    t.ok(services.length === 1)
    t.is(services[0].logoutUrl, 'http://example.com')
    t.is(services[0].serviceTicketId, st.tid)
  })
})
