'use strict'

const URL = require('url')
const ILP = require('ilp')
exports.SPSP = ILP.SPSP
exports.IPR = ILP.IPR
exports.PSK = ILP.PSK
exports.Plugin = require('ilp-plugin-payment-channel-framework')

exports.parseAuthToken = function (string) {
  if (string.indexOf('ilp_secret:') === 0) {
    string = string.replace('ilp_secret:', '')
  }
  const uri = Buffer.from(string, 'base64').toString('utf8')
  let parsed = URL.parse(uri)
  const auth = parsed.auth.split(':')
  parsed.prefix = auth.username
  parsed.token = auth.password
  return parsed
}
