# cas-server

This module provides a Node native implementation of a [CAS][cas] server. It is
extensible via a simple [plugin interface](md/Plugins.md), and will implement
versions 1.0, 2.0, and 3.0 of the [protocol][casp]. It currently supports
the authentication and service validation mechanisms of all three versions;
proxy support will be added later.

Protocol compatibility special note: this server will prefer adhering to the
latest version of the protocol when supporting all versions would be too
cumbersome. For example, the potential redirect on logout. In version 2.0 the
service could send a `url` parameter. In version 3.0, that was deprecated in
favor of a `service` parameter. This server does not recognize the `url`
parameter at all.

[cas]: http://apereo.github.io/cas/4.1.x/index.html
[casp]: https://apereo.github.io/cas/4.1.x/protocol/CAS-Protocol-Specification.html

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

> The reference implementation uses a [PostgreSQL][postgres] database.
> Before starting the installation, you should have such a database setup.

```bash
$ git clone https://github.com/jscas/cas-server
$ cd cas-server
$ npm install --production # to install the base dependencies
$ npm install pg # for the service/ticket registries
$ npm install cas-server-pg-registries
$ npm install cas-server-auth-json
$ npm install cas-server-theme
$ cp settings.example.js settings.js
$ # edit the settings.js file according to the instructions within
```

[postgres]: https://www.postgresql.org/
[dbschema]: https://github.com/jscas/cas-server-db-schema
[schemaread]: https://github.com/jscas/cas-server-db-schema/Readme.md

### OpBeat Integration

The server has built-in support for [OpBeat][opbeat] reporting. By default, this
is disabled. You can enable it within your `settings.js` file. Currently, this
server does not directly register any errors with the OpBeat client. This may
change in future versions.

Special note: when writing your `settings.js` script you *must* avoid requiring
any modules that the OpBeat client instruments. You can view the list of these
modules in the [client's source code][opbeat-modules]. We initialize the OpBeat
client *after* we load the `settings.js` script; thus the client would not
be able to hook into the instrumented modules if you require any there.

[opbeat]: https://opbeat.com/
[opbeat-modules]: https://github.com/opbeat/opbeat-node/blob/master/lib/instrumentation/index.js#L11

### Database

You must have a [PostgreSQL][postgres] database and user available. The user
must be able to create tables and issue select, update, and insert queries.

See the [cas-server-pg-registries][pg-registries] readme for information on
creating and configuring the database.

[pg-registries]: https://github.com/jscas/cas-server-pg-registries

## Run It

Once installed, running the server is as simple as:

```bash
$ node server.js -c ./settings.js
```

## Adding A Service

At the moment, you must add services by directly adding them to your database.
To do so, insert a record into the `services` table like so:

```sql
insert into services (id, name, url, comment) values (
  '69B38CEA-6EAB-42CE-B254-81114DE6733D', -- this can be created with the cli tool `uuidgen`
  'foo-service',
  'https://app.example.com/cas-callback-endpoint',
  'a simple service that authenticates via cas'
);
```

## License

[MIT License](http://jsumners.mit-license.org/)
