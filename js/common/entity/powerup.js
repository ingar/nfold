var _ = require('underscore')._
var Entity = require('./base').Entity
var collide = require('../collide')
var entity = require('./entity')

// Base powerup
function powerup(opts) {
  Entity.apply(this, [_.extend({
    type: 'powerup',
    powerup_type: null,
    radius: 2,
    flags: Entity.SPAWN_SERVER
  }, opts)])
}

powerup.prototype.initCollide = function() {
  return collide.Point(this.position, { flags: Entity.VISIBLE | Entity.PHYSICAL })
}

powerup.prototype.updateCollide = function() {}

powerup.prototype.collide_player = function(player) {
  player.add_powerup(this.powerup_type)
  this.kill()
}
powerup.prototype = new Entity()

exports.Powerup = powerup

var Powerup = powerup

function _createPowerup(name, powerupOptions) {
  function fn(opts) {
    powerup.apply(this, [_.extend(powerupOptions, opts)])
  }
  fn.prototype = new powerup()
  exports[name] = fn
  entity.register(name, fn)
}

_createPowerup('powerup_doublerate', {
  type: 'powerup_doublerate',
  powerup_type: 'doublerate'
})

_createPowerup('powerup_doublespread', {
  type: 'powerup_doublespread',
  powerup_type: 'doublespread'
})

_createPowerup('powerup_triplespread', {
  type: 'powerup_triplespread',
  powerup_type: 'triplespread'
})

_createPowerup('powerup_nonagun', {
  type: 'powerup_nonagun',
  powerup_type: 'nonagun'
})

_createPowerup('powerup_awesomeness', {
  type: 'powerup_awesomeness',
  powerup_type: 'awesomeness'
})

exports.powerups = {
  create: function(powerup_type) {
    return _.extend({ ttl: 10 }, exports.powerups[powerup_type])
  },
  doublerate: {
    flags: Powerup.PU_DOUBLERATE,
    type: 'doublerate'
  },
  doublespread: {
    flags: Powerup.PU_DOUBLESPREAD,
    type: 'doublespread'
  },
  triplespread: {
    type: 'triplespread',
    flags: Powerup.PU_TRIPLESPREAD
  },
  nonagun: {
    type: 'nonagun',
    flags: Powerup.PU_NONAGUN
  },
  awesomeness: {
    type: 'awesomeness',
    flags: Powerup.PU_DOUBLERATE | Powerup.PU_NONAGUN
  }
}
