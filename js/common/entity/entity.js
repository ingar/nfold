var _ = require('underscore')._
var log = require('../log')

// Main factory method to create entities
// opts must have a 'type' property, eg. { type: 'player' }
var entities = {}

exports.register = function(name, fn) {
  log.debug("Registering entity: " + name.toLowerCase())
  entities[name.toLowerCase()] = fn
}

exports.create = function(opts) {
  var ctor = entities[opts.type.toLowerCase()]
  var ent = new ctor(opts)
  return ent
}