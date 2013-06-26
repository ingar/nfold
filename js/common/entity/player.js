var _ = require('underscore')._
var Entity = require('./base').Entity
var powerup = require('./powerup')
var Powerup = powerup.Powerup
var entity = require('./entity')
var pubsub = require('../pubsub')

// Player
autofire_rate = 250

calculate_powerup_flags = function(powerups) {
  var flags = 0x0
  _.each(powerups, function(pu) {
    flags = (flags | pu.flags)
  })
  return flags
}

function Player(opts) {
  Entity.apply(this, [_.extend({
    type: 'Player',
    flags: Entity.COLLIDE_SERVER | Entity.SPAWN_SERVER | Entity.SPAWN_CLIENT,
    heal_rate: 10,
    rotate_speed: 4.0,
    thrust: 500.0,
    reverse_thrust: 250.0,
    drag_coefficient: 0.01,
    radius: 8,

    lastFireTime: 0,
    health: 100,
    max_health: 100,
    powerup_flags: 0x0,
    powerups: {},
    projectile: 'Projectile'
  }, opts)])
}

Player.prototype = new Entity()

Player.prototype.rotateLeft = function(scale) {
  this.rotate(-this.rotate_speed * scale)
}

Player.prototype.rotateRight = function(scale) {
  this.rotate(this.rotate_speed * scale)
}

Player.prototype.forwardThrust = function() {
  this.acceleration = mat2.transform(mat2.rotate(this.rotation), [0, this.thrust])
}

Player.prototype.reverseThrust = function() {
  this.acceleration = mat2.transform(mat2.rotate(this.rotation + Math.PI), [0, this.reverse_thrust])
}

Player.prototype.fire = function() {
  var rate = (this.powerup_flags & Powerup.PU_DOUBLERATE) ? autofire_rate * 0.5 : autofire_rate
  var t = (new Date).getTime()
  if (t - this.lastFireTime > rate) {
    this._fire()
    this.lastFireTime = t
  }
}

// TODO: Refactor vigorously
Player.prototype._fire = function() {
  var opts = {
    type: this.projectile,
    owner: this.id,
    position: this.position,
    velocity: this.velocity,
    rotation: this.rotation
  }

  var noisy = function(x, variance) {
    return x + Math.random()*variance - 0.5*variance
  }

  if (this.powerup_flags & (Powerup.PU_DOUBLESPREAD | Powerup.PU_TRIPLESPREAD | Powerup.PU_NONAGUN)) {

    if (this.powerup_flags & Powerup.PU_DOUBLESPREAD) {
      spread = 0.0872664626 * 2
      this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - spread }), true)
      this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + spread }), true)
    }

    if (this.powerup_flags & Powerup.PU_TRIPLESPREAD) {
      spread = 0.0872664626 * 4
      this.sim.spawn(opts, true)
      this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, Math.random()) }), true)
      this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, noisy(1.0, 0.5)) }), true)
    }

    if (this.powerup_flags & Powerup.PU_NONAGUN) {
      count = 9
      spread = (2 * Math.PI) / count
      variance = 0.25 * spread
      i = 0
      while (i < count) {
        this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread*i, variance) }), true)
        i++
      }
    }

  } else {
    this.sim.spawn(opts, true)
  }
}

Player.prototype.simulate = function(dt, sim) {
  this.health = rangelimit(this.health + this.heal_rate * dt, 0, this.max_health)

  removed_powerups = []

  _.each(this.powerups, function(pu, puName) {
    pu.ttl -= dt
    if (pu.ttl <= 0) {
      removed_powerups.push(puName)
    }
  })

  _.each(removed_powerups, function(puName) {
    this.remove_powerup(puName)
  }, this)
}

Player.prototype.damage = function(amount, ownerId) {
  console.log("Player " + this.name + " damaged by " + this.sim.world.get(ownerId).name)
  this.health -= amount
  if (this.health <= 0) {
    this.kill()
  } else {
    pubsub.publish('damage', { entity: this, amount: amount })
  }
}

// server
Player.prototype.addPowerup = function(pu) {
  if (this.sim.type != 'server') {
    return
  }
  this.powerups[pu.powerup_type] = {
    ttl: pu.ttl,
    flags: pu.powerup_flags
  }
  this.powerup_flags = calculate_powerup_flags(this.powerups)
  this.sim.net.broadcast('entity_update', { id: this.id, powerups: this.powerups, powerup_flags: this.powerup_flags })
}

// client, server
Player.prototype.remove_powerup = function(powerup_type) {
  delete this.powerups[powerup_type]
  this.powerup_flags = calculate_powerup_flags(this.powerups)
}

exports.Player = Player
entity.register('Player', Player)