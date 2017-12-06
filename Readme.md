# JSCAS

*JSCAS* provides a Node native implementation of a [CAS][cas] server. It is
extensible via a simple [plugin interface](md/Plugins.md), and implements
versions 1.0, 2.0, and 3.0 of the [protocol][casp]. It currently supports
the authentication and service validation mechanisms of all three versions;
proxy support will be added later.

In general, *JSCAS* attempts to meet the following goals:

1. Be more easily customizable than the standard reference implementation.
1. Be easily extensible through plugins.
1. "Just work" with a minimal amount of configuration (due the protocol's
nature, some configuration is absolutely required).

Protocol compatibility special note: this server will prefer adhering to the
latest version of the protocol when supporting all versions would be too
cumbersome. For example, the potential redirect on logout. In version 2.0 the
service could send a `url` parameter. In version 3.0, that was deprecated in
favor of a `service` parameter. This server does not recognize the `url`
parameter at all.

[cas]: https://apereo.github.io/cas/current/index.html
[casp]: https://github.com/apereo/cas/blob/1f3be83298/docs/cas-server-documentation/protocol/CAS-Protocol-Specification.md

## Demo

A demonstration deployment of the server, and a sample application, ships
with the server. To try it out:

1. Clone the repository: `git clone https://github.com/jscas/cas-server.git`
1. Navigate to the directory: `cd cas-server`
1. Update hosts file: `echo '127.0.0.1 app.example.com cas.example.com' >> /etc/hosts`
1. Run [docker-compose][docker-compose]: `docker-compose up`
1. Navigate to `http://app.example.com:3000` in a web browser

Note: the configuration for this demonstration is **not recommended** for
production. It uses lax cookie settings in order to make it work on Chrome
since Chrome doesn't work correctly with local test URLs otherwise.

[docker-compose]: https://docs.docker.com/compose/

## Install

> TODO: cover using a cloned install and a `npm i -g` install


## License

[MIT License](http://jsumners.mit-license.org/)
