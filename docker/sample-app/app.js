'use strict'

const fastify = require('fastify')({
  logger: {
    level: 'trace',
    prettyPrint: true
  }
})

fastify
  .register(require('fastify-cookie'))
  .register(require('fastify-caching'), {
    expiresIn: 3600000
  })
  .register(require('fastify-server-session'), {
    secretKey: '12345678901234567890123456789012',
    cookie: {
      domain: '.app.example.com',
      path: '/',
      expires: 3600000,
      secure: false,
      sameSite: 'lax',
      httpOnly: true
    }
  })

const html =
`
<p>
  This is a very basic demo. Once you click the login link, you will be
  taken to the CAS server to authenticate. Use "auser" for the username and
  "123456" for the password. You will then be redirected back to this app
  to see the "secret" information.
</p>

<p><a href="/secret-stuff">Login</a></p>
`
fastify.get('/', (req, reply) => {
  reply.type('text/html').send(html)
})

fastify.register((instance, opts, next) => {
  instance.register(require('fastify-cas'), {
    appBaseUrl: 'http://app.example.com:3000',
    casServer: {
      baseUrl: 'http://cas.example.com:9000'
    }
  })

  instance.get('/secret-stuff', (req, reply) => {
    reply.send({
      user: req.session.cas.user,
      userGroups: req.session.cas.memberOf
    })
  })

  next()
})

fastify.listen(3000)
