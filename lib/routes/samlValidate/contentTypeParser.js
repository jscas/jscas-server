'use strict'

const xmlJs = require('xml-js')

module.exports = function xmlContentParser (req, body, done) {
  if (body.length < 32) {
    // Arbitrary minimum length. An actual body should be much longer.
    // We just need a check to make sure we received something.
    return done(Error('invalid xml'))
  }
  try {
    const parsed = xmlJs.xml2js(body, {compact: true})

    const envelope = parsed['SOAP-ENV:Envelope']
    if (!envelope) {
      return done(Error('missing SOAP envelope'))
    }

    const soapBody = envelope['SOAP-ENV:Body']
    if (!soapBody) {
      return done(Error('missing SOAP envelope body'))
    }

    const samlpRequest = soapBody['samlp:Request']
    if (!samlpRequest) {
      return done(Error('missing SAMLP request'))
    }

    const artifact = samlpRequest['samlp:AssertionArtifact']
    if (!artifact) {
      return done(Error('missing assertion artifact'))
    }

    done(null, {
      id: samlpRequest._attributes.RequestID,
      issued: new Date(samlpRequest._attributes.IssueInstant),
      ticket: artifact._text.trim()
    })
  } catch (e) {
    done(e)
  }
}
