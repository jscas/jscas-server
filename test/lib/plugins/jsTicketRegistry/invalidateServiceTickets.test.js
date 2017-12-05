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

test('throws if ticket does not exist', (t) => {
  t.plan(1)
  const server = clone(serverProto)
  plugin(server, {}, () => {
    t.rejects(server.jscasPlugins.ticketRegistry.invalidateST.bind('123456'))
  })
})

test('marks a valid ticket as invalid', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt1 = await server.jscasPlugins.ticketRegistry.genTGT('foo')
    const st1 = await server.jscasPlugins.ticketRegistry.genST(tgt1.tid)
    const st2 = await server.jscasPlugins.ticketRegistry.invalidateST(st1.tid)
    t.strictDeepInequal(st2, st1)
    t.is(st2.valid, false)

    const st3 = await server.jscasPlugins.ticketRegistry.getST(st1.tid)
    t.strictDeepEqual(st3, st2)
  })
})
