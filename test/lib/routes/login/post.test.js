'use strict'

const test = require('tap').test
const clone = require('clone')
const nullLogger = require('../../../nullLogger')
const plugin = require('../../../../lib/routes/login')

const serverProto = {
  jscasPlugins: {
    theme: {},
    auth: []
  },
  jscasHooks: {
    preAuth: []
  },
  jscasInterface: {},
  jscasTGTCookie: 'tgt-cookie',

  get: function () {},

  post: function (path, handler) {
    this.postLogin = handler
  }
}

test('returns unknown service page', (t) => {
  t.plan(5)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return undefined
    }
  }
  server.jscasPlugins.theme = {
    unknownService (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return 'unknown service'
    }
  }

  plugin(server, {}, () => {
    const req = {
      body: {service: 'http://example.com'},
      session: {csrfToken: 'csrf123', renewal: false},
      log: nullLogger
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 406)
        return this
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'unknown service')
      })
      .catch(t.threw)
  })
})

test('redirects to login for invalid csrf token', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }

  plugin(server, {}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf-invalid'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf-invalid')
        return false
      }
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 302)
        return this
      },

      redirect (url) {
        t.is(url, '/login?service=' + encodeURIComponent('http://example.com'))
        return 'redirect'
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('redirects when no authenticators are registered', (t) => {
  t.plan(6)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }

  plugin(server, {}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 302)
        return this
      },

      redirect (url) {
        t.is(url, '/login?service=' + encodeURIComponent('http://example.com'))
        return 'redirect'
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('redirects when authentication fails', (t) => {
  t.plan(8)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '654321')
      return false
    }
  })

  plugin(server, {}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '654321'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 302)
        return this
      },

      redirect (url) {
        t.is(url, '/login?service=' + encodeURIComponent('http://example.com'))
        return 'redirect'
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('redirects when authentication fails with rejection', (t) => {
  t.plan(8)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '654321')
      throw Error('rejecting for fun')
    }
  })

  plugin(server, {}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '654321'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 302)
        return this
      },

      redirect (url) {
        t.is(url, '/login?service=' + encodeURIComponent('http://example.com'))
        return 'redirect'
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('successfully authenticates and redirects for non-renewal', (t) => {
  t.plan(15)
  const server = clone(serverProto)
  server.jscasInterface = {
    createServiceTicket: async function (tgtId, name) {
      t.is(tgtId, '123456')
      t.is(name, 'foo')
      return {tid: '67890'}
    },

    createTicketGrantingTicket: async function (username) {
      t.is(username, 'foo')
      return {tid: '123456'}
    },

    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '123456')
      return true
    }
  })

  plugin(server, {cookie: {a: 'b'}}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '123456'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
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
        t.is(req.session.isAuthenticated, true)
        return 'redirect'
      },

      setCookie (name, value, options) {
        t.is(name, 'tgt-cookie')
        t.is(value, '123456')
        t.strictDeepEqual(options, {a: 'b'})
        return this
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('successfully authenticates and redirects for renewal', (t) => {
  t.plan(15)
  const server = clone(serverProto)
  server.jscasInterface = {
    createServiceTicket: async function (tgtId, name) {
      t.is(tgtId, '123456')
      t.is(name, 'foo')
      return {tid: '67890'}
    },

    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, '123456')
      return {tid}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '123456')
      return true
    }
  })

  plugin(server, {cookie: {a: 'b'}}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '123456'
      },
      cookies: {
        'tgt-cookie': '123456'
      },
      session: {renewal: true},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
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
        t.is(req.session.isAuthenticated, true)
        return 'redirect'
      },

      setCookie (name, value, options) {
        t.is(name, 'tgt-cookie')
        t.is(value, '123456')
        t.strictDeepEqual(options, {a: 'b'})
        return this
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('returns server error when ticket access fails', (t) => {
  t.plan(11)
  const server = clone(serverProto)
  server.jscasInterface = {
    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    },

    getTicketGrantingTicket: async function (tid) {
      t.is(tid, '123456')
      throw Error('simulating broken ticket registry')
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '123456')
      return true
    }
  })
  server.jscasPlugins.theme = {
    serverError (context) {
      t.type(context, Object)
      t.ok(context.error)
      t.match(context.error, /simulating/)
      return 'server error'
    }
  }

  plugin(server, {cookie: {a: 'b'}}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '123456'
      },
      cookies: {
        'tgt-cookie': '123456'
      },
      session: {renewal: true},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
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

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'server error')
      })
      .catch(t.threw)
  })
})

test('redirects to /login with no service and bad credentials', (t) => {
  t.plan(7)
  const server = clone(serverProto)
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '654321')
      return false
    }
  })

  plugin(server, {}, () => {
    const req = {
      body: {
        csrfToken: 'csrf123',
        username: 'foo',
        password: '654321'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
    }
    const reply = {
      type (val) {
        t.is(val, 'text/html')
        return this
      },

      code (num) {
        t.is(num, 302)
        return this
      },

      redirect (url) {
        t.is(url, '/login')
        return 'redirect'
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('redirects to /success with no service and good credentials', (t) => {
  t.plan(10)
  const server = clone(serverProto)
  server.jscasInterface = {
    createTicketGrantingTicket: async function (username) {
      t.is(username, 'foo')
      return {tid: '123456', expires: new Date(Date.now() + 1000)}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '654321')
      return true
    }
  })

  plugin(server, {}, () => {
    const req = {
      body: {
        csrfToken: 'csrf123',
        username: 'foo',
        password: '654321'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
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
        t.is(url, '/success')
        return 'redirect'
      },

      setCookie (name, value, options) {
        t.is(name, 'tgt-cookie')
        t.is(value, '123456')
        return this
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})

test('processes registered preAuth hooks', (t) => {
  t.plan(17)
  const server = clone(serverProto)
  server.jscasInterface = {
    createServiceTicket: async function (tgtId, name) {
      t.is(tgtId, '123456')
      t.is(name, 'foo')
      return {tid: '67890'}
    },

    createTicketGrantingTicket: async function (username) {
      t.is(username, 'foo')
      return {tid: '123456'}
    },

    getService: async function (serviceUrl) {
      t.is(serviceUrl, 'http://example.com')
      return {name: 'foo', url: serviceUrl}
    }
  }
  server.jscasPlugins.auth.push({
    validate: async function (username, password) {
      t.is(username, 'foo')
      t.is(password, '654321')
      return true
    }
  })

  // successful hook
  server.jscasHooks.preAuth.push(async function (username, password, serviceUrl) {
    t.is(username, 'foo')
    t.is(password, '654321')
    t.is(serviceUrl, 'http://example.com')
    return true
  })
  // unsuccessful hook (should continue login)
  server.jscasHooks.preAuth.push(async function () {
    t.is(1, 1)
    throw Error('ignored error')
  })

  plugin(server, {}, () => {
    const req = {
      body: {
        service: 'http://example.com',
        csrfToken: 'csrf123',
        username: 'foo',
        password: '654321'
      },
      session: {renewal: false},
      log: nullLogger,
      isValidCsrfToken (token) {
        t.is(token, 'csrf123')
        return true
      }
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

      setCookie (name, value, options) {
        t.is(name, 'tgt-cookie')
        t.is(value, '123456')
        return this
      }
    }

    server.postLogin(req, reply)
      .then((result) => {
        t.is(result, 'redirect')
      })
      .catch(t.threw)
  })
})
