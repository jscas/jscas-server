# cas-server

This module provides a Node native implementation of a [CAS][cas] server. It is
extensible via a simple [plugin interface](md/Plugins.md), and will implement
versions 1.0, 2.0, and 3.0 of the [protocol][casp]. It currently supports
the authentication and service validation mechanisms of all three versions;
proxy support will be added later.

[cas]: http://jasig.github.io/cas/4.1.x/index.html
[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md

## Install

> These install instructions will guide you through installing the reference
> implementation of the server. You may use different plugins to provide
> functionality such as the ticket and service registries. In such a case, the
> installation requirements may vary.

> The reference implementation uses a [PostgreSQL][psql] 9.4 or later database.
> Before starting the installation, you should have such a database setup.

First, clone the [cas-server-db-schema][dbschema] repository and follow the
instructions in its [Readme.md][schemaread].

Next:

```bash
$ git clone https://github.com/jscas/cas-server
$ cd cas-server
$ npm install # to install the base dependencies
$ npm install --no-optional jscas/cas-server-pg-ticket-registry
$ npm install --no-optional jscas/cas-server-pg-service-registry
$ npm install jscas/cas-server-auth-json
$ npm install jscas/cas-server-theme
$ cp settings.example.js settings.js
$ # edit the settings.js file according to the instructions within
```

[psql]: http://www.postgresql.org/
[dbschema]: https://github.com/jscas/cas-server-db-schema
[schemaread]: https://github.com/jscas/cas-server-db-schema/Readme.md

## Run It

Once installed, running the server is as simple as:

```bash
$ node server.js run -c ./settings.js
```

## Adding A Service

The reference [service registry][sr] plugin provides an end point for adding
new services -- `/pgServiceRegistry/addService`. Read the plugin's Readme.md for
details on how to use the end point.

[sr]: https://github.com/jscas/cas-server-pg-service-registry

## License

[MIT License](http://jsumners.mit-license.org/)
