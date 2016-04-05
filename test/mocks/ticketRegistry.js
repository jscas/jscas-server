'use strict';

const noTicketError = new Error('could not find ticket');

const goodTicket = {
  tid: 'good-ticket',
  created: new Date(),
  expires: new Date(Date.now() +  60000),
  valid: true
};

const badTicket = {
  tid: 'bad-ticket',
  created: new Date(Date.now() - 60000),
  expires: new Date(),
  valid: false
};

const tgt = {
  tid: 'valid-tgt',
  created: new Date(),
  expires: new Date(Date.now() + 60000),
  userId: 'fbar'
};

const tgtExpired = {
  tid: 'expired-tgt',
  created: new Date(Date.now() - 60000),
  expires: new Date(Date.now() - 50000),
  userId: 'fbar'
};

const st = {
  tid: 'valid-st',
  tgtId: 'valid-tgt',
  created: new Date(),
  expires: new Date(Date.now() + 60000),
  serviceId: 1,
  valid: true
};

const stExpired = {
  tid: 'expired-st',
  tgtId: 'valid-tgt',
  created: new Date(Date.now() - 60000),
  expires: new Date(Date.now() - 50000),
  serviceId: 1,
  valid: true
};

module.exports.name = 'mockTicketRegistry';

module.exports.plugin = function mockTR(config, context) {
  return {
    genLT(expires) {
      return Promise.resolve(goodTicket);
    },

    genTGT(loginTicketId, userId, expires) {
      if (loginTicketId === badTicket.tid) {
        return Promise.reject(new Error('expired ticket'));
      }
      if (loginTicketId === goodTicket.tid && userId === 'fbar') {
        return Promise.resolve(tgt);
      }
      return Promise.reject(noTicketError);
    },

    genST(ticketGrantingTicketId, expires, serviceId) {
      if (ticketGrantingTicketId !== tgt.tid) {
        return Promise.reject(new Error('invalid tgt'));
      }
      switch (serviceId) {
        case 'expired-st':
          return Promise.resolve(stExpired);
        default:
          return Promise.resolve(st);
      }
    },

    invalidateLT(loginTicketId) {
      if (loginTicketId === goodTicket.tid) {
        return Promise.resolve(Object.assign(goodTicket, {valid: false}));
      }
      return Promise.reject(noTicketError);
    },

    invalidateTGT(ticketGrantingTicketId) {
      if (ticketGrantingTicketId === tgt.tid) {
        return Promise.resolve(Object.assign(tgt, {valid: false}));
      }
      return Promise.reject(noTicketError);
    },

    invalidateST(serviceTicketId) {
      if (serviceTicketId === st.tid) {
        return Promise.resolve(Object.assign(st, {valid: false}));
      }
      return Promise.reject(noTicketError);
    },

    clear() {},

    close() {
      return Promise.resolve(true);
    },

    getLT(loginTicketId) {
      if (loginTicketId === goodTicket.tid) {
        return Promise.resolve(goodTicket);
      }
      return Promise.reject(noTicketError);
    },

    getTGT(ticketGrantingTicketId) {
      switch (ticketGrantingTicketId) {
        case tgt.tid:
          return Promise.resolve(tgt);
        case tgtExpired.tid:
          return Promise.resolve(tgtExpired);
        default:
          Promise.reject(noTicketError);
      }
    },

    getST(serviceTicketId) {
      switch (serviceTicketId) {
        case 'valid-st':
          return Promise.resolve(st);
        case 'expired-st':
          return Promise.resolve(stExpired);
        default:
          return Promise.reject(noTicketError);
      }
    },

    getTGTbyST(serviceTicketId) {
      if (serviceTicketId === st.tid) {
        return Promise.resolve(tgt);
      }
      return Promise.reject(noTicketError);
    }
  }
};
