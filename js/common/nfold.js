var _ = require('underscore')._
var World = require('./world').World
var Simulation = require('./simulation').Simulation
var Game = require('./game').Game

var POWERUP_SPAWN_FREQUENCY = 1000
var MAX_POWERUPS = 1
var POWERUP_TYPES = ['doublerate', 'doublespread', 'triplespread', 'nonagun', 'awesomeness']

function NFold(isServer, gameOpts) {
  this.isServer = isServer
  this.world = new World({ width: 300, height: 300 })
  this.sim = new Simulation({
    type: isServer ? Simulation.SERVER : Simulation.CLIENT,
    world: this.world
  })
  this.game = new Game(_.extend({ sim: this.sim, world: this.world }, gameOpts))
}

NFold.prototype.run = function() {
  this.game.mainLoop()
  if (this.isServer) {
    this._addPowerups()
  }
}

NFold.prototype._countPowerups = function() {
  var total = 0
  this.world.allEntities(function(ent) {
    if (ent.type.match(/^powerup_/)) { total += 1 }
  })
  return total
}

NFold.prototype._addRandomPowerup = function () {
  var powerupType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
  this.sim.spawn({
    type: 'powerup_' + powerupType,
    powerup_type: powerupType,
    position: this.world.randomLocation()
  }, true)
}

NFold.prototype._addPowerups = function() {
  var self = this

  if (this._countPowerups() < MAX_POWERUPS) {
    this._addRandomPowerup()
  }

  setTimeout(function() {
    self._addPowerups()
  }, POWERUP_SPAWN_FREQUENCY)
}

exports.NFold = NFold