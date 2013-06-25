var _ = require('underscore')._
var Entity = require('./base').Entity
var collide = require('../collide')
var entity = require('./entity')

// Base Powerup
function Powerup(opts) {
  Entity.apply(this, [_.extend({
    type: 'Powerup',
    powerup_type: null,
    powerup_flags: 0x0,
    ttl: 10,
    radius: 2,
    flags: Entity.SPAWN_SERVER
  }, opts)])
}
Powerup.prototype = new Entity()

Powerup.prototype.initCollide = function() {
  return collide.Point(this.position, { flags: Entity.VISIBLE | Entity.PHYSICAL })
}

Powerup.prototype.updateCollide = function() {}

Powerup.prototype.collide_player = function(player) {
  player.add_powerup(this)
  this.kill()
}

Powerup.PU_DOUBLERATE   = 0x0001
Powerup.PU_DOUBLESPREAD = 0x0002
Powerup.PU_TRIPLESPREAD = 0x0004
Powerup.PU_NONAGUN      = 0x0008

exports.Powerup = Powerup

function _createPowerup(name, powerupOptions) {
  function fn(opts) {
    Powerup.apply(this, [_.extend(powerupOptions, opts)])
  }
  fn.prototype = new Powerup()
  entity.register(name, fn)
}

_createPowerup('powerup_doublerate', {
  type: 'powerup_doublerate',
  powerup_flags: Powerup.PU_DOUBLERATE,
  powerup_type: 'doublerate'
})

_createPowerup('powerup_doublespread', {
  type: 'powerup_doublespread',
  powerup_flags: Powerup.PU_DOUBLESPREAD,
  powerup_type: 'doublespread'
})

_createPowerup('powerup_triplespread', {
  type: 'powerup_triplespread',
  powerup_flags: Powerup.PU_TRIPLESPREAD,
  powerup_type: 'triplespread'
})

_createPowerup('powerup_nonagun', {
  type: 'powerup_nonagun',
  powerup_flags: Powerup.PU_NONAGUN,
  powerup_type: 'nonagun'
})

_createPowerup('powerup_awesomeness', {
  type: 'powerup_awesomeness',
  powerup_flags: Powerup.PU_DOUBLERATE | Powerup.PU_NONAGUN,
  powerup_type: 'awesomeness'
})