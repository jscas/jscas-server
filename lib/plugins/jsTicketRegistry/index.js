'use strict'

const fp = require('fastify-plugin')
const clone = require('clone')
const merge = require('merge-options')
const uidSafe = require('uid-safe')
const {LRUMap} = require('lru_map')

async function close () {
  return true
}

async function genST (tgtId, expires, serviceId) {
  if (!this.tickets.has(tgtId)) throw Error('cannot generate service ticket: missing ticket granting ticket')
  const currentDoc = this.tickets.get(tgtId)
  for (const st of currentDoc.sts.entries()) {
    if (st[1].serviceId !== serviceId) continue
    if (st[1].expires > new Date()) return st[1]
    currentDoc.sts.splice(st[0], 1)
    break
  }

  const tid = await uidSafe(this.KEY_LENGTH)
  const ticket = {
    tid,
    created: new Date(),
    expires: expires || new Date(Date.now() + this.TICKET_LIFE),
    valid: true,
    serviceId
  }
  currentDoc.sts.push(ticket)
  this.tickets.set(tgtId, currentDoc)
  return ticket
}

async function genTGT (userId, expires) {
  for (const item of this.tickets.entries()) {
    if (item[1].tgt.userId !== userId) continue
    if (item[1].tgt.expires > new Date()) return item[1].tgt
    this.tickets.delete(item[0])
    break
  }

  const tid = await uidSafe(this.KEY_LENGTH)
  const ticket = {
    tid,
    userId,
    created: new Date(),
    expires: expires || new Date(Date.now() + this.TICKET_LIFE),
    valid: true
  }
  const doc = Object.create({}, {
    tgt: {value: ticket, enumerable: true},
    sts: {value: [], enumerable: true},
    logins: {value: [], enumerable: true}
  })
  this.tickets.set(tid, doc)
  return ticket
}

async function getST (stId) {
  for (const item of this.tickets.entries()) {
    const st = item[1].sts.find((_st) => _st.tid === stId)
    if (st) return st
  }
  throw Error('invalid service ticket id')
}

async function getTGT (tgtId) {
  if (!this.tickets.has(tgtId)) throw Error('invalid ticket granting ticket id')
  return this.tickets.get(tgtId).tgt
}

async function getTGTbyST (stId) {
  for (const item of this.tickets.entries()) {
    const stIndex = item[1].sts.findIndex((st) => st.tid === stId)
    if (stIndex < 0) continue
    return this.tickets.get(item[0]).tgt
  }
  throw Error('invalid service ticket id')
}

async function invalidateST (stId) {
  for (const item of this.tickets.entries()) {
    const stIndex = item[1].sts.findIndex((st) => st.tid === stId)
    if (stIndex < 0) continue
    const doc = this.tickets.get(item[0])
    const newDoc = clone(doc)
    newDoc.sts[stIndex].valid = false
    this.tickets.set(newDoc.tgt.tid, newDoc)
    return newDoc.sts[stIndex]
  }
  throw Error('invalid service ticket id')
}

async function invalidateTGT (tgtId) {
  if (!this.tickets.has(tgtId)) throw Error('invalid ticket granting ticket id')
  const doc = this.tickets.get(tgtId)
  const newDoc = clone(doc)
  newDoc.tgt.valid = false
  this.tickets.set(tgtId, newDoc)
  return newDoc.tgt
}

async function servicesLogForTGT (tgtId) {
  if (!this.tickets.has(tgtId)) throw Error('invalid ticket granting ticket id')
  return this.tickets.get(tgtId).logins
}

async function trackServiceLogin (st, tgt, serviceUrl) {
  if (!this.tickets.has(tgt.tid)) throw Error('invalid ticket granting ticket')
  const doc = this.tickets.get(tgt.tid)
  doc.logins.push({
    serviceTicketId: st.tid,
    logoutUrl: serviceUrl
  })
  this.tickets.set(tgt.tid, doc)
  return Promise.resolve()
}

module.exports = fp(function jsTicketRegistry (server, options, next) {
  const opts = merge({maxTickets: 1000, keyLength: 18, ticketLife: 300000}, options)
  const instance = Object.create({
    close,
    genST,
    genTGT,
    invalidateST,
    invalidateTGT,
    getST,
    getTGT,
    getTGTbyST,
    servicesLogForTGT,
    trackServiceLogin,
    tickets: new LRUMap(opts.maxTickets)
  }, {
    KEY_LENGTH: {value: opts.keyLength},
    TICKET_LIFE: {value: opts.ticketLife}
  })

  server.registerTicketRegistry(instance)
  next()
})

module.exports.pluginName = 'jsTicketRegistry'
