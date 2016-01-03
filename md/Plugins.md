# Plugins API

All functionality outside of the base [CAS protocol][casp] is implemented via
plugins. The list of plugin types, and the order in which they will be
loaded, is:

+ `theme`: provides templates for various parts of the user interactive portions
  of the protocol (e.g. a login form)
+ `ticketRegistry`: provides functionality to create and validate tickets
+ `serviceRegistry`: provides functionality to create, manage, and validate
  allowed services
+ `auth`: provides a function to validate credentials (username and password)
+ `misc`: provides various add-on functionality that isn't necessarily specifc
  to the CAS protocol

Plugins are initialized in two phases, and only the first phase is required.

[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md

## Plugin Type Specifications

+ [Ticket Registry](TicketRegistry.md)
+ [Service Registry](ServiceRegistry.md)

## First Phase

The first phase requires that a `plugin` method and a `name` property be
present on `module.exports`. During initialization the `plugin` method will be
invoked with two parameters: `options` and `context`. The `options` parameter
will be retrieved from the server's main configuration by the exported `name`.
The `context` will be the following object:

```javascript
{
  logger: {} // an instance of the Winston logging API
}
```

The `plugin` method should export an object of methods. Each of these methods
**must** return a `Promise` when invoked. These promises should *always* resolve
with a "success" condition and reject under any other condition. For example,
the `validate` method exported by an `auth` plugin should resolve when the
credentials are valid and reject when they are not.

As should be clear, during the first initialization phase your plugin should
be able to operate as if there were not a CAS server on the other end. All
methods should function on their own with whatever data they are passed.

## Second Phase

At the second phase all registered plugins that have a exported a `postInit`
method will have that method invoked after the web server has been started. This
method allows for deep integration with the actual CAS server. The `postInit`
method will be invoked with a single `context` parameter. This parameters is
the following object:

```javascript
{
  server: {}, // the actual Hapi web server object and all the API it provides
  ticketRegistry: {} // the CAS ticket registry object
}
```

As with the `plugin` methods, this method should return a `Promise`. The
resolution should be on successful initialization and the rejection on any other
state. The rejection *should* include an `Error` object that describes the
reason for failure. The resolution parameter *may* be an object:

```javascript
{
  hooks: {} // CAS server operation hooks, described later
}
```

Note the order in which plugins are are initially loaded, this is the same
order in which they will be processed during the second phase. The implication
of this is that `registry` plugins can overwrite work done by `theme` plugins,
and `auth` plugins can overwrite work done by `registry` plugins.

Also note that each plugin time is processed in *0,1,...,n* order. Thus, the
order in which your plugin is defined in the server's configuration can affect
how your plugin operates.

### Hooks

Hooks allow you to tell the CAS server that you are interested in performing
some action, or can provide some information, at specific steps in the
protocol flow. Available hooks are:

```javascript
{
  // you can provide information about a given user
  userAttributes: function userAttributes(userid) {}
}
```

Again, any hook function you supply must return a `Promise` wherein the
resolution only occurs in successful situations and rejects on all others.

All hooks are invoked in the order in which their owning plugin was registered.
And all hooks will be invoked regardless of the outcome of other hooks.

#### userAttributes

When you register a function with this hook you are telling the CAS server
that you can provide it with extra details about a user based on their
user id (usually "username").

+ `resolution`: the resolution **must** be passed a JSON serializable object.
  The object may not actually be serialized to JSON, but it must be possible.
  It also **must** conform to this object structure:

        {
          standardAttributes: {
            memberOf: ['strings']
          },
          extraAttributes: {
            anyKey: 'preferrably a string value'
          }
        }
+ `rejection`: an instance of `Error` that details what went wrong. This may or
  may not be recorded in logging data.

If your hook successfully returns data then the object will be merged into a
pre-defined object. This means subsequent hooks *may* return an object with
properties that will overwrite yours. Once all registered `userAttributes` hooks
have been processed, the final object will be stored in the server's registry.
