'use strict'

const test = require('tap').test
const clone = require('clone')
const nullLogger = require('../../../nullLogger')
const plugin = require('../../../../lib/routes/login')

const serverProto = {
  jscasPlugins: {
    theme: {}
  },
  jscasHooks: {
    preAuth: []
  },
  jscasInterface: {},
  jscasTGTCookie: 'tgt-cookie',

  get: function (path, handler) {
    this.getLogin = handler
  },

  post: function () {}
}

test('returns login page for new session and empty service', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    login: function (context) {
      t.type(context, Object)
      t.is(context.service, undefined)
      t.is(context.csrfToken, 'csrf123')
      return 'login page'
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {service: undefined, renew: undefined},
      session: {csrfToken: 'csrf123'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'login page')
      })
      .catch(t.threw)
  })
})

test('returns login page for new session with service', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    login: function (context) {
      t.type(context, Object)
      t.is(context.service, 'http://example.com')
      t.is(context.csrfToken, 'csrf123')
      return 'login page'
    }
  }
  server.jscasInterface = {
    getService: async function () {
      return {name: 'foo', tid: '123456'}
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {csrfToken: 'csrf123'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'login page')
      })
      .catch(t.threw)
  })
})

test('returns unknown service page for invalid service', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    unknownService: function (url) {
      t.is(url, 'http://example.com')
      return 'unknown service'
    }
  }
  server.jscasInterface = {
    getService: async function () {
      throw Error('unknown service')
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },
      code (num) {
        t.is(num, 400)
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'unknown service')
      })
      .catch(t.threw)
  })
})

test('returns unauthorized for invalid ticket granting ticket', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    unauthorized: function () {
      return 'unauthorized'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo'}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, 'invalid')
      throw Error('invalid ticket')
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {isAuthenticated: true},
      cookies: {'tgt-cookie': 'invalid'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },
      code (num) {
        t.is(num, 403)
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'unauthorized')
      })
      .catch(t.threw)
  })
})

test('returns unauthorized for missing ticket granting ticket', (t) => {
  t.plan(4)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    unauthorized: function () {
      return 'unauthorized'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo'}
    },

    getTicketGrantingTicket: async function (tid) {
      t.fail('should not be invoked')
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {isAuthenticated: true},
      cookies: {},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },
      code (num) {
        t.is(num, 403)
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'unauthorized')
      })
      .catch(t.threw)
  })
})

test('returns login error for expired ticket granting ticket', (t) => {
  t.plan(10)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    login: function (context) {
      t.type(context, Object)
      t.ok(context.error)
      t.match(context.error, /session has expired/)
      t.is(context.csrfToken, 'csrf123')
      return 'expired ticket'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', tid: '123456'}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, '654321')
      return {expired: true}
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {isAuthenticated: true, csrfToken: 'csrf123'},
      cookies: {'tgt-cookie': '654321'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },
      code (num) {
        t.is(num, 403)
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'expired ticket')
        t.strictDeepEqual(req.session, {
          isAuthenticated: false,
          csrfToken: 'csrf123'
        })
      })
      .catch(t.threw)
  })
})

test('returns login error for session errors', (t) => {
  t.plan(7)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    login: function (context) {
      t.type(context, Object)
      t.ok(context.error)
      t.match(context.error, /form validation error/)
      t.is(context.csrfToken, 'csrf123')
      return 'validation error'
    }
  }
  server.jscasInterface = {
    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url}
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {
        isAuthenticated: false,
        csrfToken: 'csrf123',
        lastError: Error('form validation error')
      },
      cookies: {'tgt-cookie': '654321'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'validation error')
      })
      .catch(t.threw)
  })
})

test('returns server error when cannot generate service ticket', (t) => {
  t.plan(9)
  const server = clone(serverProto)
  server.jscasPlugins.theme = {
    serverError: function (context) {
      t.type(context, Object)
      t.ok(context.error)
      t.match(context.error, /could not generate/)
      return 'server error'
    }
  }
  server.jscasInterface = {
    createServiceTicket: async function (tgtId) {
      t.is(tgtId, '654321')
      throw Error('oops')
    },

    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo'}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, '654321')
      return {expired: false, tid}
    }
  }

  plugin(server, {}, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {isAuthenticated: true},
      cookies: {'tgt-cookie': '654321'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },
      code (num) {
        t.is(num, 500)
        return this
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'server error')
      })
      .catch(t.threw)
  })
})

test('generates a service ticket for a good ticket granting ticket', (t) => {
  t.plan(8)
  const options = {
    cookie: {
      expires: 1000
    }
  }
  const server = clone(serverProto)
  server.jscasInterface = {
    createServiceTicket: async function (tgtId) {
      t.is(tgtId, '654321')
      return {tid: '67890'}
    },

    getService: async function (url) {
      t.is(url, 'http://example.com')
      return {name: 'foo', url: 'http://example.com'}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, '654321')
      return {expired: false, tid}
    }
  }

  plugin(server, options, () => {
    const req = {
      query: {
        service: 'http://example.com',
        renew: undefined
      },
      session: {isAuthenticated: true},
      cookies: {'tgt-cookie': '654321'},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 303)
        return this
      },

      redirect (url) {
        t.is(url, 'http://example.com?ticket=67890')
        return 'redirect'
      },

      setCookie () {
        t.pass()
      }
    }

    server.getLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})
