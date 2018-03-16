'use strict'

const path = require('path')
const fork = require('child_process').fork
const request = require('request')
const nock = require('nock')
const test = require('tap').test

const serverCWD = path.resolve(path.join(__dirname, '..', '..'))
const serverPath = path.join(serverCWD, 'server.js')

// Warning: this is not pretty. The CAS protocol requires several requests
// back and forth between the client and the server. In order to exercise the
// actual server, we need to simulate the whole conversation:
//
// 1. GET the `/login` form
// 2. POST the `/login` form
// 3. Intercept successful login as "the application" (client)
// 4. GET `/p3/serviceValidate` the service ticket as the application
test('authenticates a user using protocol v3', {timeout: 5000}, (t) => {
  t.plan(6)

  require('get-port')().then((port) => {
    const env = {
      jscas_server_port: port,
      jscas_domain: '127.0.0.1',
      nixconfig_config_home: __dirname
    }

    const server = fork(serverPath, [], {
      env,
      cwd: serverCWD,
      silent: true
    })

    t.tearDown(() => {
      if (server) server.kill()
    })

    server.on('exit', (code, signal) => {
      if (code !== 0) {
        t.fail(`terminated via signal ${signal} with code ${code}`)
      }
    })

    server.on('message', (m) => {
      if (m !== 'ready') return t.fail('unknown message from server')
      playRequests()
    })

    function playRequests () {
      const cookieJar = request.jar()
      const req = request.defaults({
        baseUrl: `http://127.0.0.1:${port}`,
        jar: cookieJar,
        followAllRedirects: true
      })

      nock('http://app.example.com')
        .get((path) => {
          t.match(path, /\/casauth/)
          return path.includes('/casauth')
        })
        .query((q) => {
          t.ok(q.ticket)
          t.match(q.ticket, /[_A-Za-z0-9-]+/)
          validateServiceTicket(q.ticket, (err, isValidTicket) => {
            if (err) t.threw(err)
            t.ok(isValidTicket)
          })
          return q.hasOwnProperty('ticket')
        })
        .reply(200)

      const serviceUrl = 'http://app.example.com/casauth'
      req({
        url: '/login',
        qs: {service: serviceUrl}
      }, function (err, res, body) {
        if (err) t.threw(err)

        t.match(body, /<input id="csrfToken"/)
        const csrfTokenMatches = /name="csrfToken" type="hidden" value="([_A-Za-z0-9-]+)">/.exec(body)
        if (!csrfTokenMatches) t.fail('recieved no login form from server')
        req({
          url: '/login',
          method: 'POST',
          form: {
            csrfToken: csrfTokenMatches[1],
            username: 'auser',
            password: '123456',
            service: serviceUrl
          }
        }, function (err) {
          if (err) t.threw(err)
          // We don't need to do anything here. It's a redirect that gets
          // handled by the `nock` intercept.
        })
      })

      function validateServiceTicket (ticket, cb) {
        req({
          url: '/p3/serviceValidate',
          qs: {
            ticket,
            service: serviceUrl
          }
        }, function (err, res, body) {
          if (err) t.threw(err)
          t.match(body, /<cas:authenticationSuccess>/)
          cb(null, true)
        })
      }
    }
  }).catch(t.threw)
})
