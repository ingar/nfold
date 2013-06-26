var log = require('../log')

exports.entities = {}

exports.register = function(name, fn) {
  log.debug("Registering entity: " + name.toLowerCase())
  exports.entities[name.toLowerCase()] = fn
}

exports.create = function(opts) {
  var ctor = exports.entities[opts.type.toLowerCase()]
  var ent = new ctor(opts)
  return ent
}