# cas-server

This module provides a Node native implementation of a [CAS][cas] server. It is
extensible via a simple [plugin interface](md/Plugins.md), and will implement
versions 1.0, 2.0, and 3.0 of the [protocol][casp]. It currently supports
the authentication and service validation mechanisms of all three versions;
proxy support will be added later.

[cas]: http://jasig.github.io/cas/4.1.x/index.html
[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md

### API Stability Notice

We are using [Semantic Versioning][semver]. With this versioning scheme we are
able to drastically change any aspect of the API, or the server itself, during
the initial version 0 development ([point 4][p4]).

**Until version 1.0.0 anything about** ***cas-server*** **may change with any release.**

Please keep up with the [changelog](Changelog.md). All important changes will
be listed there.

[semver]: http://semver.org/
[p4]: http://semver.org/#spec-item-4

## Install

> These install instructions will guide you through installing the reference
> implementation of the server. You may use different plugins to provide
> functionality such as the ticket and service registries. In such a case, the
> installation requirements may vary.

> The reference implementation uses a [MongoDB][mongodb] database.
> Before starting the installation, you should have such a database setup.

```bash
$ git clone https://github.com/jscas/cas-server
$ cd cas-server
$ npm install --production # to install the base dependencies
$ npm install mongoose # for the ticket registries
$ npm install cas-server-mongo-registries
$ npm install cas-server-auth-json
$ npm install cas-server-theme
$ cp settings.example.js settings.js
$ # edit the settings.js file according to the instructions within
```

[mongodb]: http://www.mongodb.org/
[dbschema]: https://github.com/jscas/cas-server-db-schema
[schemaread]: https://github.com/jscas/cas-server-db-schema/Readme.md

## Run It

Once installed, running the server is as simple as:

```bash
$ node server.js -c ./settings.js
```

## Adding A Service

At the moment, you must add services by directly adding them to your database.
Simply create a collection named 'jscasservices', and add a document like:

```json
{
  "name" : "testapp",
  "comment" : "service for testing locally",
  "url" : [
    "http://localhost:9500/casHandler",
    "http://127.0.0.1:9500/casHandler"
  ],
  "slo" : false,
  "sloType" : 0,
  "sloUrl" : ""
}
```

Note: the MongoDB service registry requires explicit service URLs. You cannot
store regular expressions for the service URLs.

## License

[MIT License](http://jsumners.mit-license.org/)
