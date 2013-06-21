var _ = require('underscore')._

var listeners = {}

exports.publish = function(name, data) {
  _.each(listeners[name], function(fn) {
    fn(data)
  })
}

exports.subscribe = function(name, fn) {
  if (!listeners[name]) {
    listeners[name] = []
  }
  listeners[name].push(fn)
}