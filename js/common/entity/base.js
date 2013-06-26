var _ = require('underscore')._
var collide = require('../collide')
var physics = require('../physics')
var pubsub = require('../pubsub')
var entity = require('./entity')

// Base Entity
function Entity(options) {
  var opts = options || {}
  _.extend(this, {
    type: 'Entity',
    flags: 0x0,
    id: (opts.type || 'Entity') + ':' + Math.round(Math.random() * 0xFFFFFFFF).toString(16),
    position: [320, 240],
    velocity: [0, 0],
    acceleration: [0, 0],
    angular_velocity: 0,
    rotation: 0
  }, opts)
  this.collide = this.initCollide()
  this.collide.entity = this
}

Entity.prototype.updatePhysics = physics.standard

Entity.prototype.initCollide = function() {
  return collide.AABB_cwh(this.position, this.radius*2, this.radius*2)
}

Entity.prototype.updateCollide = function() {
  this.collide.update_cwh(this.position, this.radius*2, this.radius*2)
}

Entity.prototype.simulate = function(dt) {}

Entity.prototype.rotate = function(theta) {
  this.rotation += rangewrap(theta, 2*Math.PI)
}

Entity.prototype.spawn = function() {}

Entity.prototype.kill = function() {
  this.remove_me = true
  pubsub.publish('killed', this.id)
}

Entity.prototype.positionData = function() {
  return {
    id: this.id,
    position: this.position,
    velocity: this.velocity,
    acceleration: this.acceleration,
    rotation: this.rotation
  }
}

Entity.prototype.serialize = function() {
  out = {}
  _.each(this, function(v, k) {
    if (_.isNumber(v) || _.isArray(v) || _.isString(v)) {
      out[k] = v
    }
  })
  return out
}

Entity.prototype.deserialize = function(data) {
  _.extend(this, data)
}

Entity.prototype._simulate = function(dt, sim) {
  this.updatePhysics(dt, sim)
  this.simulate(dt, sim)
  this.updateCollide(dt, sim)
}

_.extend(Entity, {
  COLLIDE_SERVER:   0x0004,
  SPAWN_SERVER:     0x0040,
  SPAWN_CLIENT:     0x0080
})

exports.Entity = Entity