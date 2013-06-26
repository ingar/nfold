var _ = require('underscore')._
var Entity = require('./base').Entity
var collide = require('../collide')
var entity = require('./entity')

// Explosion
function Explosion(opts) {
  Entity.apply(this, [_.extend({
    type: 'Explosion',
    age: 0,
    lifespan: Math.random() * 0.75 + 0.25,
    expansion_rate: Math.random() * 100 + 50,
    radius: 0,
    flags: exports.SPAWN_CLIENT,
    render_radius: 1
  }, opts)])
}
Explosion.prototype = new Entity()

Explosion.prototype.initCollide = function() {
  return collide.Point(this.position)
}

Explosion.prototype.updateCollide = function() {}

Explosion.prototype.simulate = function(dt) {
  this.age += dt
  if (this.age >= this.lifespan) {
    this.kill()
  } else {
    this.render_radius += this.expansion_rate * dt
  }
}

exports.Explosion = Explosion
entity.register('Explosion', Explosion)