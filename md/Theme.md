# Theme Plugin

A theme plugin is used to generate HTML documents for the user as defined in the
[CAS protocol][casp]. Your them plugin **must** conform to the description in
this document.

You should use the [reference implementation][refimp] as a guide.

[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md
[refimp]: https://github.com/jscas/cas-server-theme/

## Interface

A theme plugin's `plugin` method returns an object that matches:

```javascript
{
  internalError: function(context) {},
  login: function(context) {},
  loginRedirect: function(context) {},
  logout: function(context) {},
  noService: function(context) {},
  unauthorized: function(context) {},
}
```

Each method **must** return a `Promise` with a resolution that passes in a
compiled HTML document as a string and an `Error` on rejection.

Each method *may* be given a `context` object so that the plugin can
display certain values to the user or use them in some other manner.

## Contexts

Any method that does not have a context described in this section does not
currently receive a context from `cas-server`.

### internalError

```javascript
{
  errorMessage: 'string describing why the 500 was thrown'
}
```

### login

```javascript
{
  lt: 'string login ticket',
  service: 'string url for the requesting service',
  errorMessage: 'string detailing login failure'
}
```

The `lt` and `service` values **must** be added to the login form as *hidden*
inputs. You *may* display the `service` property to the user. It is
**recommended** that you do not make the service URL a clickable link.

The login form **must** submit values for variables `username` and
`password`.

`errorMessage` will only be set if a login error occurred (most likely due to
credentials validation failure).

### loginRedirect

```javascript
{
  service: 'string url for the requesting service',
  ticket: 'string service ticket value'
}
```

This page will be used if the server is not configured to redirect the client
via a HTTP 303. The `service` and `ticket` values **must** be used as query
parameters in the redirection, however that is accomplished. Their values
**must** not be modified.
