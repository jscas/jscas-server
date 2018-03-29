# Tickets

This document describes the expected shape of the objects known as "tickets"
in the CAS protocol. Plugins should accept and return objects that match the
descriptions herein.

<a id="serviceTicket"></a>
## Serivce Ticket

Service tickets are issued upon a successful authorization, or verification that
a user had previously authorized. These tickets are returned to the requesting
service by sending the ticket id (`tid`) to the service. The service will then
validate that ticket via another request to the server. Service tickets must
be valid for exactly one use. They must also automatically expire within a
certain timeframe without having been used.

+ `tid` (string): a unique identifier for the ticket. It should be URL/cookie
safe. A cryptographically secure random generator should be used to generate
this id.
+ `created` (Date): the date and time at which the ticket was issued.
+ `expires` (Date): the date and time upon which the ticket will expire if it
hasn't already been used. Once this time is reached, this property will
supersede the `valid` property.
+ `valid` (bool): indicates if the ticket has been validated or not. Once set
to `false` it takes precendence over the `expires` property.
+ `serviceId` (string): identfier for the service within the service registry.
This is likely the service URL.

<a id="ticketGrantingTicket"></a>
## Ticket Granting Ticket

Ticket granting tickets are issued to a user upon successful authorization.
They are functionally equivalent to a session, except *JSCAS* uses a separate
session for tracking user details. These tickets are used to track the
services a user requests authorization to during the lifetime of the ticket.
They provide an audit trail for authorizations provided they are retained in
a long lived database.

+ `tid` (string): a unique identifier for the ticket. It should be URL/cookie
safe. A cryptographically secure random generator should be used to generate
this id.
+ `userId` (string): an identifer for the user this ticket is assigned to. It
is most likely to be the user's username.
+ `created` (Date): the date and time at which the ticket was issued.
+ `expires` (Date): the date and time upon which the ticket will expire. Once
this time is reached, this property will supersede the `valid` property.
+ `valid` (bool): indicates if the ticket is valid for the purposes of creating
new service tickets.
