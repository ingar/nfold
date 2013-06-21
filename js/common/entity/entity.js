var _ = require('underscore')._

// Main factory method to create entities
// opts must have a 'type' property, eg. { type: 'player' }
var entities = {}

exports.register = function(name, fn) {
  entities[name] = fn
}

exports.create = function(opts) {
  var ctor = entities[opts.type]
  var ent = new ctor(opts)
  return ent
}