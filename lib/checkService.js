'use strict';

const ioc = require('laic').laic.casServer;
const log = ioc.lib.get('logger');
const serviceRegistry = ioc.get('plugins').serviceRegistry;

module.exports = function* checkService(serviceUrl) {
    let _service;
    try {
      log.debug('validating service: %s', serviceUrl);
      _service = yield serviceRegistry.getServiceWithUrl(serviceUrl);
      log.debug('service is valid: %s', _service.name);
    } catch (e) {
      log.error('could not find service: %s', serviceUrl);
      log.debug(e.message);
      return false;
    }

    return true;
};
