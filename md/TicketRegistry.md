# Ticket Registry Plugin

A ticket registry plugin is used to handle all ticket types as defined in the
[CAS protocol][casp]. Your ticket registry plugin **must** conform to the
description in this document.

[casp]: https://github.com/Jasig/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md

## Interface

A ticket registry plugin's `plugin` method returns an object that matches:

```javascript
{
  genLT: function(expires) {},
  genTGT: function(loginTicketId, userId, expires) {},
  genST: function(ticketGrantingTicketId, expires, serviceId) {},
  invalidateLT: function(loginTicketId),
  invalidateTGT: function(ticketGrantingTicketId),
  invalidateST: function(serviceTicketId),
  clear: function() {},
  close: function() {},
  getLT: function(loginTicketId) {},
  getTGT: function(ticketGrantingTicketId) {},
  getST: function(serviceTicketId) {},
  getTGTbyST: function(serviceTicketId) {},
  trackServiceLogin: function(serviceTicket, ticketGrantingTicket, serviceUrl) {},
  servicesLogForTGT: function(tid) {}
}
```

Each of the `gen` and `get` methods **must** return a corresponding ticket
object as the parameter of a `Promise` resolution.

## Tickets

Each ticket **must** implement the base object:

```javascript
{
  tid: 'string identifier for the ticket',
  created: 'date and time when the ticket was issued',
  expires: 'date and time when the ticket will expire',
  valid: 'boolean indicating the current validity of the ticket'
}
```

The `valid` property **must** be set to `false` when the corresponding
`invalidate` method has been invoked. The `valid` property *may* not be updated
upon ticket expiration; the expiration time should always be verified during
ticket validations.

See the subsections of this section for the requirements for each
specific ticket type.

## Login Ticket (LT)

Merely implements the base ticket object.

## Service Ticket (LT)

Extends the base ticket object with the following properties:

+ `tgtId`: an identifier for the associated Ticket Granting Ticket. It *may* be
  the actual Ticket Granting Ticket `tid`.
+ `serviceId`: will be used during Single Log Out (SLO) if such is enabled. The
  `serviceId` will be used to link Ticket Granting Tickets to services stored
  in a service registry.

## Ticket Granting Ticket (TGT)

Extends the base ticket object with the following properties:

+ `userId`: an identifier that ties the ticket to a specific user.
+ `services`: a list of services that have used this TGT. This list will be used
  during SLO. Each service in the list must be an object with the properties:

    * `serviceId`: the same service identfier as was present on the ST.
    * `logoutUrl`: the URL presented by the service during LT validation.

  The `serviceId` will be used to find the corresponding service in the service
  registry during SLO.

## Methods

### genLT(expires)

Will be invoked to generate a new Login Ticket (LT). The `expires` parameter
*should* accept a `Date` object that specifies when the LT will no longer be
valid.

The returned `Promise` **must** pass a LT object on resolution and an `Error`
on rejection.

### genTGT(loginTicketId, userId, expires)

Will be invoked to generate a new Ticket Granting Ticket (TGT). The
`loginTicketId` parameter *should* be used to link the new TGT to the LT that
was used to allow the TGT to be generated. The `userId` parameter *should* be
stored in such a way that it is tied to the new TGT. The `expires` parameter
*should* accept a `Date` object that specifies when the TGT will no longer be
valid.

This method *should* validate the LT prior to issuing a new TGT. If the LT is
invalid, e.g. doesn't exist or is expired, then this method should return
a rejected `Promise`.

The returned `Promise` **must** pass a TGT object on resolution and an `Error`
on rejection.

### genST(ticketGrantingTicketId, expires, serviceId)

Will be invoked to generate a new Service Ticket. The `ticketGrantingTicketId`
*should* be used to link the new ST to the TGT that was used to allow the ST
to be generated. The `expires` parameter *should* accept a `Date` object that
specifies when the ST will no longer be valid. The `serviceId` parameter
*should* be used to store a service identifier with the ST so that the CAS
server may use it for Single Log Out.

This method *should* validate the TGT prior to issuing a new ST. If the TGT is
invalid, e.g. doesn't exist or is expired, then this method should return
a rejected `Promise`.

The returned `Promise` **must** pass a ST object on resolution and an `Error`
on rejection.

### invalidateLT(loginTicketId)

This method will be invoked to mark a LT as no longer usable. The returned
`Promise` *must* include the updated LT on success and an `Error` on rejection.

### invalidateTGT(ticketGrantingTicketId)

This method will be invoked to mark a TGT as no longer usable. The returned
`Promise` *must* include the updated TGT on success and an `Error` on rejection.

### invalidateST(serviceTicketId)

This method will be invoked to mark a ST as no longer usable. The returned
`Promise` *must* include the updated ST on success and an `Error` on rejection.

### close()

This method will be invoked when the server is shutting down. You should
clean up any connections or timers that will prevent shutdown.

The returned `Promise` *should* pass a `true` value on success and an `Error`
on rejection.

### getLT(loginTicketId)

The `Promise` returned by this method **must** pass a single LT on success or
an `Error` on rejection.

### getTGT(ticketGrantingTicketId)

The `Promise` returned by this method **must** pass a single TGT on success or
an `Error` on rejection.

### getST(serviceTicketId)

The `Promise` returned by this method **must** pass a single ST on success or
an `Error` on rejection.

### trackServiceLogin(serviceTicket, ticketGrantingTicket, serviceUrl)

Will be invoked during service ticket validation so that `/logout` can send
logout messages to all services a user authenticated to with a specific
ticket granting ticket. This method's returned `Promise` **may** not be
checked.

You should store the `serviceTicket.serviceId` and `seviceUrl` as an object
with the properties:

+ `serviceId`
+ `logoutUrl`

## servicesLogForTGT(tid)

Will be invoked during SLO to retrieve the list of services that were tracked
via `trackServiceLogin()`. The result **must** be a list of objects with
properties:

+ `serviceId`: identifier to lookup the service in the service registry with.
+ `logoutUrl`: the URL to be used for SLO *unless* the service registry reports
  a different URL.
