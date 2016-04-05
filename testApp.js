'use strict';

const hapi = require('hapi');
const server = new hapi.Server();

server.connection({
  address: '127.0.0.1',
  port: 9500
});

server.register({
  register: require('hapi-server-session'),
  options: {
    expiresIn: 60 * 1000,
    key: 'nope',
    cookie: {
      isSecure: false
    },
    name: 'testApp'
  }
}, function (err) { if (err) { throw err; } });

server.register(require('hapi-cas'), (err) => {
    const options = {
      casProtocolVersion: 3,
      casServerUrl: 'http://127.0.0.1:9000',
      localAppUrl: 'http://127.0.0.1:9500',
      endPointPath: '/casHandler',
      renew: true
    };
    server.auth.strategy('casauth', 'cas', options);
  }
);

server.route({
  path: '/',
  method: 'GET',
  config: {
    auth: {
      strategy: 'casauth'
    }
  },
  handler: function(req, reply) {
    reply(
      `Welcome, ${req.session.username}
      (${req.session.attributes.firstName} ${req.session.attributes.lastName})`
    );
  }
});

server.start(function() {
  console.log('test app server started');
});
