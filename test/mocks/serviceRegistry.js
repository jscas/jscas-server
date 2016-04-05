'use strict';

const noServiceError = new Error('no service found');

const service = {
  name: 'a-service',
  url: 'http://example.com/',
  comment: 'A simple service'
};

module.exports.name = 'mockServiceRegistry';

module.exports.plugin = function mockSR(config, context) {
  return {
    getServiceWithName(name) {
      if (name === service.name) {
        return Promise.resolve(service);
      }
      return Promise.reject(noServiceError);
    },

    getServiceWithUrl(url) {
      if (url === service.url) {
        return Promise.resolve(service);
      }
      return Promise.reject(noServiceError);
    },

    close() {}
  }
};
