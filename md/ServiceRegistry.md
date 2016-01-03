# Service Registry Plugin

A service registry plugin is used to authenticate `service` parameters as
defined in the [CAS protocol][casp]. Your service registry plugin **must**
conform to the description in this document.

[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md

## Interface

A service registry's `plugin` method returns an object that matches:

```javascript
{
  getServiceWithName: function(name) {},
  getServiceWithUrl: function(url) {},
  close: function() {}
}
```

Each `get` method **must** return an object that matches:

```javascript
{
  name: 'string display name for the service',
  url: 'string url that represents the remote service',
  comment: 'string description of the service (can be null)'
}
```

The returned service object *should* also contain an internal identifier
property `id`. This `id` property *may* be used for Single Log Out.


## Methods

### getServiceWithName(name)

This method is used to retrieve a service based on the name that was supplied
when it was added to the registry.

The `Promise` returned from this method **must** be a valid service object
on success and an `Error` on rejection.

### getServiceWithUrl(url)

This method is used to retrieve a service based on the url supplied in a
`service` parameter. This method **must** validate the incoming `url` against
a *single* service within the registry.

Note: The reference implementation allows for URLs to be defined in the database
as POSIX regular expressions. It uses the incoming `url` to query the database
by matching it against the reference database's `services.url` column.

The `Promise` returned from this method **must** be a valid service object
on success and an `Error` on rejection.

### close()

This method will be invoked during server shutdown. You should clean up any
connections or timers that will prevent shutdown.
