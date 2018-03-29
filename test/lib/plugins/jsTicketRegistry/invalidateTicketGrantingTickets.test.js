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
    t.rejects(server.jscasPlugins.ticketRegistry.invalidateTGT.bind('123456'))
  })
})

test('marks a valid ticket as invalid', (t) => {
  t.plan(3)
  const server = clone(serverProto)
  plugin(server, {}, async () => {
    const tgt1 = await server.jscasPlugins.ticketRegistry.genTGT('foo')
    const tgt2 = await server.jscasPlugins.ticketRegistry.invalidateTGT(tgt1.tid)
    t.strictDeepInequal(tgt2, tgt1)
    t.is(tgt2.valid, false)

    const tgt3 = await server.jscasPlugins.ticketRegistry.getTGT(tgt1.tid)
    t.strictDeepEqual(tgt3, tgt2)
  })
})
