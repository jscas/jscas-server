'use strict';

function noop(){}

// see https://www.promisejs.org/generators/ for how this works
module.exports = function asyncRequest(generatorFunc) {
  const generator = generatorFunc();

  function controller(result) {
    if (result.done) {
      return result.value.then(noop); // invoke the returned Promise
    }

    return Promise.resolve(result.value).then(
      function doResolution(response) {
        return controller(generator.next(response));
      },
      function throwError(response) {
        return controller(generator.throw(response));
      }
    )
  }

  try {
    return controller(generator.next()); // kick off the generator
  } catch (err) {
    if (err instanceof Promise) {
      err.then(noop); // invoke the returned Promise
    } else {
      return Promise.reject(err);
    }
  }
};
