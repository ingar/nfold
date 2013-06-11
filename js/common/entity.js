// underscore.js
// math.js
// pubsub.js
// physics.js

if (typeof window === 'undefined') {
  require('./math')
  var _ = require('underscore')._
  var physics = require('./physics')
  var pubsub = require('./pubsub')
  var collide = require('./collide')
}

(function(exports) {

  var PU_DOUBLERATE   = 0x0001
  var PU_DOUBLESPREAD = 0x0002
  var PU_TRIPLESPREAD = 0x0004
  var PU_NONAGUN      = 0x0008

  _.extend(exports, {
    MOVE_SERVER:      0x0001,
    SIMULATE_SERVER:  0x0002,
    COLLIDE_SERVER:   0x0004,
    MOVE_CLIENT:      0x0008,
    SIMULATE_CLIENT:  0x0010,
    COLLIDE_CLIENT:   0x0020,
    SPAWN_SERVER:     0x0040,
    SPAWN_CLIENT:     0x0080,
    VISIBLE:          0x0010,
    PHYSICAL:         0x0020
  })

  // Main factory method to create entities
  // opts must have a 'type' property, eg. { type: 'player' }
  exports.create = function(opts) {
    var ent = Object.create(exports[opts.type])
    ent._init(opts)
    return ent
  }

  exports.Entity = {
    type: 'Entity',
    flags: 0x0,

    _init: function(opts) {
      this.id = (opts.type || 'Entity') + ':' + Math.round(Math.random() * 0xFFFFFFFF).toString(16)

      this.position = [320, 240]
      this.velocity = [0, 0]
      this.acceleration = [0, 0]
      this.angular_velocity = 0
      this.rotation = 0

      _.extend(this, opts)
      this.collide = this.init_collide()
      this.collide.entity = this
    },

    update_physics: physics.standard,

    init_collide: function() {
      return collide.AABB_cwh(this.position, this.radius*2, this.radius*2, { flags: exports.PHYSICAL | exports.VISIBLE })
    },

    update_collide: function() {
      this.collide.update_cwh(this.position, this.radius*2, this.radius*2)
    },

    simulate: function(dt) {},

    rotate: function(theta) {
      this.rotation += rangewrap(theta, 2*Math.PI)
    },

    spawn: function() {},

    kill: function() {
      this.remove_me = true
      pubsub.publish('killed', this.id)
    },

    position_data: function() {
      return {
        id: this.id,
        position: this.position,
        velocity: this.velocity,
        acceleration: this.acceleration,
        rotation: this.rotation
      }
    },

    serialize: function() {
      out = {}
      _.each(this, function(v, k) {
        if (_.isNumber(v) || _.isArray(v) || _.isString(v)) {
          out[k] = v
        }
      })
      return out
    },

    deserialize: function(data) {
      _.extend(this, data)
    },

    _simulate: function(dt, sim) {
      this.update_physics(dt, sim)
      this.simulate(dt, sim)
      this.update_collide(dt, sim)
    }
  }


  var initial_velocity = 300

  exports.Projectile = _.extend(Object.create(exports.Entity), {
    type: 'Projectile',
    damage: 25,
    radius: 1,
    lifespan: 2.0,
    flags: exports.SPAWN_CLIENT | exports.SPAWN_SERVER,

    _init: function(opts) {
      exports.Entity._init.call(this, opts)
      this.age = 0
    },

    init_collide: function() {
      return collide.Point(this.position, { flags: exports.PHYSICAL | exports.VISIBLE })
    },

    update_collide: function() {
      this.collide.update_point(this.position)
    },

    simulate: function(dt) {
      this.age += dt
      if (this.age > this.lifespan) {
        this.kill()
      }
    },

    spawn: function() {
      this.velocity = vec2.add(this.velocity, mat2.transform(mat2.rotate(this.rotation), [0, initial_velocity]))
    },

    kill: function() {
      exports.Entity.kill.call(this)
      this.sim.spawn({ type: 'Explosion', position: this.position }, false)
    },

    collide_player: function(player) {
      this.sim.kill(this.id, true)
      player.damage(this.damage, this.owner)
    }
  })

  exports.Explosion = _.extend(Object.create(exports.Entity), {
    type: 'Explosion',
    age: 0,
    lifespan: Math.random() * 0.75 + 0.25,
    expansion_rate: Math.random() * 100 + 50,
    radius: 0,
    flags: exports.SPAWN_CLIENT,

    _init: function(opts) {
      exports.Entity._init.call(this, opts)
      this.render_radius = 1
    },

    init_collide: function() {
      return collide.Point(this.position, { flags: exports.VISIBLE })
    },

    update_collide: function() {},

    simulate: function(dt) {
      this.age += dt
      if (this.age >= this.lifespan) {
        this.kill()
      } else {
        this.render_radius += this.expansion_rate * dt
      }
    }
  })


  // Player
  autofire_rate = 250

  calculate_powerup_flags = function(powerups) {
    flags = 0x0
    _.each(powerups, function(pu) {
      flags = (flags | pu.flags)
    })
    return flags
  }

  exports.Player = _.extend(Object.create(exports.Entity), {
    type: 'Player',
    flags: exports.COLLIDE_SERVER | exports.SPAWN_SERVER | exports.SPAWN_CLIENT,
    heal_rate: 10,
    rotate_speed: 4.0,
    thrust: 500.0,
    reverse_thrust: 250.0,
    drag_coefficient: 0.01,
    radius: 8,

    _init: function(opts) {
      exports.Entity._init.call(this, opts)
      this.lastFireTime = 0
      this.health = 100
      this.max_health = 100
      this.powerup_flags = 0x0
      this.powerups = {}
      this.projectile = 'Projectile'
    },

    rotateLeft: function(scale) {
      this.rotate(-this.rotate_speed * scale)
    },

    rotateRight: function(scale) {
      this.rotate(this.rotate_speed * scale)
    },

    forwardThrust: function() {
      this.acceleration = mat2.transform(mat2.rotate(this.rotation), [0, this.thrust])
    },

    reverseThrust: function() {
      this.acceleration = mat2.transform(mat2.rotate(this.rotation + Math.PI), [0, this.reverse_thrust])
    },

    fire: function() {
      var rate = (this.powerup_flags & PU_DOUBLERATE) ? autofire_rate * 0.5 : autofire_rate
      var t = (new Date).getTime()
      if (t - this.lastFireTime > rate) {
        this._fire()
        this.lastFireTime = t
      }
    },

    // TODO: Refactor vigorously
    _fire: function() {
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

      if (this.powerup_flags & (PU_DOUBLESPREAD | PU_TRIPLESPREAD | PU_NONAGUN)) {

        if (this.powerup_flags & PU_DOUBLESPREAD) {
          spread = 0.0872664626 * 2
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - spread }), true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + spread }), true)
        }

        if (this.powerup_flags & PU_TRIPLESPREAD) {
          spread = 0.0872664626 * 4
          this.sim.spawn(opts, true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation - noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, Math.random()) }), true)
          this.sim.spawn(_.extend({}, opts, { rotation: opts.rotation + noisy(spread, 0.1), velocity: vec2.scale(opts.velocity, noisy(1.0, 0.5)) }), true)
        }

        if (this.powerup_flags & PU_NONAGUN) {
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
    },

    simulate: function(dt, sim) {
      this.health = rangelimit(this.health + this.heal_rate * dt, 0, this.max_health)

      removed_powerups = []

      _.each(this.powerups, function(pu) {
        pu.ttl -= dt
        if (pu.ttl <= 0) {
          removed_powerups.push(pu)
        }
      })

      _.each(removed_powerups, function(pu) {
        this.remove_powerup(pu.type)
      }, this)
    },

    damage: function(amount, owner) {
      this.health -= amount
      if (this.health <= 0) {
        this.kill()
      } else {
        pubsub.publish('damage', { entity: this, amount: amount })
      }
    },

    // server
    add_powerup: function(powerup_type) {
      if (this.sim.type != 'server') {
        return
      }

      this.powerups[powerup_type] = exports.powerups.create(powerup_type)
      this.powerup_flags = calculate_powerup_flags(this.powerups)
      this.sim.net.broadcast('entity_update', { id: this.id, powerups: this.powerups, powerup_flags: this.powerup_flags })
    },

    // client, server
    remove_powerup: function(powerup_type) {
      delete this.powerups[powerup_type]
      this.powerup_flags = calculate_powerup_flags(this.powerups)
    }
  })

  exports.powerup = _.extend(Object.create(exports.Entity), {
    type: 'powerup',
    powerup_type: null,
    radius: 2,
    flags: exports.SPAWN_SERVER,

    init_collide: function() {
      return collide.Point(this.position, { flags: exports.VISIBLE | exports.PHYSICAL })
    },

    update_collide: function() {},

    collide_player: function(player) {
      player.add_powerup(this.powerup_type)
      this.kill()
    }
  })

  exports.powerup_doublerate = _.extend(Object.create(exports.powerup), {
    type: 'powerup_doublerate',
    powerup_type: 'doublerate'
  })

  exports.powerup_doublespread = _.extend(Object.create(exports.powerup), {
    type: 'powerup_doublespread',
    powerup_type: 'doublespread'
  })

  exports.powerup_triplespread = _.extend(Object.create(exports.powerup), {
    type: 'powerup_triplespread',
    powerup_type: 'triplespread'
  })

  exports.powerup_nonagun = _.extend(Object.create(exports.powerup), {
    type: 'powerup_nonagun',
    powerup_type: 'nonagun'
  })

  exports.powerup_awesomeness = _.extend(Object.create(exports.powerup), {
    type: 'powerup_awesomeness',
    powerup_type: 'awesomeness'
  })

  exports.powerups = {
    create: function(powerup_type) {
      return _.extend({ ttl: 10 }, exports.powerups[powerup_type])
    },
    doublerate: {
      flags: PU_DOUBLERATE,
      type: 'doublerate'
    },
    doublespread: {
      flags: PU_DOUBLESPREAD,
      type: 'doublespread'
    },
    triplespread: {
      type: 'triplespread',
      flags: PU_TRIPLESPREAD
    },
    nonagun: {
      type: 'nonagun',
      flags: PU_NONAGUN
    },
    awesomeness: {
      type: 'awesomeness',
      flags: PU_DOUBLERATE | PU_NONAGUN
    }
  }

})(typeof exports === 'undefined' ? this['entity']={} : exports)


