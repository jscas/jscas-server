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

test('throws if missing ticket granting ticket', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    t.rejects(server.jscasPlugins.ticketRegistry.genST.bind('foo', new Date(), 'foo'))
  })
})

test('generates new service tickets', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    const st = await server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(Date.now + 1000), 'fooservice')
    t.type(st, Object)
    t.ok(st.tid)
    t.type(st.tid, 'string')
    t.ok(st.serviceId)
    t.is(st.serviceId, 'fooservice')
  })
})

test('returns current service ticket if not expired', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    const st1 = await server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(Date.now() + 1000), 'fooservice')
    setTimeout(() => {
      server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(), 'fooservice')
        .then((st2) => {
          t.strictDeepEqual(st2, st1)
        })
        .catch(t.threw)
    }, 100)
  })
})

test('returns new service ticket if expired', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt = await server.jscasPlugins.ticketRegistry.genTGT('foo', new Date(Date.now() + 1000))
    const st1 = await server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(Date.now() + 100), 'fooservice')
    setTimeout(() => {
      server.jscasPlugins.ticketRegistry.genST(tgt.tid, new Date(Date.now() + 100), 'fooservice')
        .then((st2) => {
          t.strictDeepInequal(st2, st1)
        })
        .catch(t.threw)
    }, 150)
  })
})
