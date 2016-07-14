'use strict'

module.exports = function streamToString (readable, cb) {
  if (!(readable instanceof require('stream').Readable)) throw new Error('input must be readable stream')

  let data
  readable.on('data', (d) => { (data) ? data += d : data = d })
  readable.on('end', () => { cb(data) })
}
