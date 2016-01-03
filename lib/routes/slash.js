'use strict';

const indexRoute = {
  path: '/',
  method: 'GET',
  handler: function (req, reply) {
    reply().redirect('/login');
  }
};

module.exports = [indexRoute];
