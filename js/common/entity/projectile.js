var _ = require('underscore')._
var collide = require('../collide')
require('../math')
var Entity = require('./base').Entity
var entity = require('./entity')

// Projectile
function Projectile(opts) {
  Entity.apply(this, [_.extend({
    type: 'Projectile',
    initialVelocity: 300,
    damage: 25,
    radius: 1,
    lifespan: 2.0,
    flags: Entity.SPAWN_CLIENT | Entity.SPAWN_SERVER,
    age: 0
  }, opts)])
}

Projectile.prototype = new Entity()

Projectile.prototype.initCollide = function() {
  return collide.Point(this.position, { flags: Entity.PHYSICAL | Entity.VISIBLE })
}

Projectile.prototype.updateCollide = function() {
  this.collide.update_point(this.position)
}

Projectile.prototype.simulate = function(dt) {
  this.age += dt
  if (this.age > this.lifespan) {
    this.kill()
  }
}

Projectile.prototype.spawn = function() {
  this.velocity = vec2.add(this.velocity, mat2.transform(mat2.rotate(this.rotation), [0, this.initialVelocity]))
}

Projectile.prototype.kill = function() {
  Entity.prototype.kill.apply(this)
  this.sim.spawn({ type: 'Explosion', position: this.position }, false)
}

Projectile.prototype.collide_player = function(player) {
  this.sim.kill(this.id, true)
  player.damage(this.damage, this.owner)
}

exports.Projectile = Projectile
entity.register('Projectile', Projectile)

