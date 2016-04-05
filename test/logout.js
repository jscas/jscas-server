'use strict';

const expect = require('chai').expect;

require('./common/setupIOC')();
const logout = require('../lib/routes/logout')[0];

function State() {
  return (cookieName, value) => this[cookieName] = value;
}

suite('Logout');

test('processes basic logout request', function basicLogout(done) {
  const state = new State();
  state('test-cookie', 'valid-tgt');

  const request = {
    method: 'get',
    state: state,
    session: {
      isAuthenticated: true
    }
  };

  function reply(message) {
    expect(message).to.be.an.instanceof(Promise);
    message.then((html) => {
      expect(html).to.equal('<h1>logout</h1>');
      done();
    });
  }

  logout.handler(request, reply);
});
