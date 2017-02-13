'use strict'

let configPath
process.argv.forEach((arg, i) => {
  const _arg = arg.toLowerCase()
  if (_arg === '-c' || _arg === '--config' || _arg === '-s' || _arg === '--settings') {
    configPath = process.argv[i + 1]
  }
})

module.exports = configPath
