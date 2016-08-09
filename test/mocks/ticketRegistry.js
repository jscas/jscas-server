'use strict'

const noTicketError = new Error('could not find ticket')

const goodTicket = { // eslint-disable-line
  tid: 'good-ticket',
  created: new Date(),
  expires: new Date(Date.now() + 60000),
  valid: true
}

const badTicket = { // eslint-disable-line
  tid: 'bad-ticket',
  created: new Date(Date.now() - 60000),
  expires: new Date(),
  valid: false
}

const tgt = {
  tid: 'valid-tgt',
  created: new Date(),
  expires: new Date(Date.now() + 60000),
  userId: 'fbar'
}

const tgtExpired = {
  tid: 'expired-tgt',
  created: new Date(Date.now() - 60000),
  expires: new Date(Date.now() - 50000),
  userId: 'fbar'
}

const st = {
  tid: 'valid-st',
  tgtId: 'valid-tgt',
  created: new Date(),
  expires: new Date(Date.now() + 60000),
  serviceId: 1,
  valid: true
}

const stExpired = {
  tid: 'expired-st',
  tgtId: 'valid-tgt',
  created: new Date(Date.now() - 60000),
  expires: new Date(Date.now() - 50000),
  serviceId: 1,
  valid: true
}

const stTGTExpired = {
  tid: 'st-tgt-expired',
  tgtId: 'expired-tgt',
  created: new Date(Date.now() - 60000),
  expires: new Date(Date.now() - 50000),
  serviceId: 1,
  valid: false
}

module.exports.name = 'mockTicketRegistry'

module.exports.plugin = function mockTR (config, context) {
  return {
    genTGT (userId, expires) {
      if (userId === 'baduser') {
        return Promise.reject(new Error('expired ticket'))
      }
      if (userId === 'fbar') {
        return Promise.resolve(tgt)
      }
      return Promise.reject(noTicketError)
    },

    genST (ticketGrantingTicketId, expires, serviceId) {
      if (ticketGrantingTicketId !== tgt.tid) {
        return Promise.reject(new Error('invalid tgt'))
      }
      switch (serviceId) {
        case 'expired-st':
          return Promise.resolve(stExpired)
        case 'a-service':
          return Promise.resolve(st)
        default:
          return Promise.reject(new Error('invalid service'))
      }
    },

    invalidateTGT (ticketGrantingTicketId) {
      if (ticketGrantingTicketId === tgt.tid) {
        return Promise.resolve(Object.assign(tgt, {valid: false}))
      }
      return Promise.reject(noTicketError)
    },

    invalidateST (serviceTicketId) {
      if (serviceTicketId === st.tid) {
        return Promise.resolve(Object.assign(st, {valid: false}))
      }
      return Promise.reject(noTicketError)
    },

    clear () {},

    close () {
      return Promise.resolve(true)
    },

    getTGT (ticketGrantingTicketId) {
      switch (ticketGrantingTicketId) {
        case tgt.tid:
          return Promise.resolve(tgt)
        case tgtExpired.tid:
          return Promise.resolve(tgtExpired)
        default:
          return Promise.reject(noTicketError)
      }
    },

    getST (serviceTicketId) {
      switch (serviceTicketId) {
        case 'valid-st':
          return Promise.resolve(st)
        case 'expired-st':
          return Promise.resolve(stExpired)
        default:
          return Promise.reject(noTicketError)
      }
    },

    getTGTbyST (serviceTicketId) {
      if (serviceTicketId === st.tid) {
        return Promise.resolve(tgt)
      }
      if (serviceTicketId === stTGTExpired.tid) {
        return Promise.resolve(tgtExpired)
      }
      return Promise.reject(noTicketError)
    },

    trackServiceLogin (st, tgt, serviceUrl) {
      const newTGT = Object.assign({}, tgt)
      newTGT.services = [{
        serviceId: st.tid,
        loginUrl: serviceUrl
      }]
      return Promise.resolve(newTGT)
    }
  }
}
