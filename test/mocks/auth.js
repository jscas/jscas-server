'use strict';

const users = {
  'fbar': {
    username: 'fbar',
    firstName: 'foo',
    surname: 'bar',
    password: '123456'
  },
  'bfoo': {
    username: 'bfoo',
    firstName: 'baz',
    surname: 'foo',
    password: '654321'
  }
};

module.exports.name = 'mockAuth';

module.exports.plugin = function mockAuth(options, context) {
  return {
    validate(username, password) {
      return users.hasOwnProperty(username) &&
        users[username].password === password;
    }
  }
};

module.exports.postInit = function mockAuthPost(context) {
  return function userAttributes(user) {
    if (!users.hasOwnProperty(user)) {
      return Promise.reject('no such user');
    }

    return Promise.resolve({
      extraAttributes: {
        username: users[user].username,
        firstName: users[user].firstName,
        lastName: users[user].surname
      }
    });
  }
};
