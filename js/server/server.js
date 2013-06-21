var _ = require('underscore')
var sim = require('../common/simulation')
var entity = require('../common/entity/entity')
var pubsub = require('../common/pubsub')
var Game = require('../common/game').Game
var log = require('../common/log')
var net = require('./net')

exports.startup = function(httpServer) {
  var POWERUP_SPAWN_FREQUENCY = 1000
  var MAX_POWERUPS = 100

  var simulation = sim.Simulation(null, { type: sim.SERVER })

  var countPowerups = function() {
    var total = 0
    simulation.each_entity(null, function(e) {
      if (e.type.match(/^powerup_/)) {
        return total += 1
      }
    })
    return total
  }

  var addPowerups = function() {
    var bounds, e, num, powerup_type, powerup_types
    bounds = simulation.world_bounds()
    num = MAX_POWERUPS - countPowerups()
    powerup_types = ['doublerate', 'doublespread', 'triplespread', 'nonagun', 'awesomeness']
    if (num > 0) {
      powerup_type = powerup_types[Math.floor(Math.random() * powerup_types.length)]
      e = simulation.spawn({
        type: 'powerup_' + powerup_type,
        powerup_type: powerup_type,
        position: [bounds.min_x + (Math.random() * bounds.max_x - bounds.min_x), bounds.min_y + (Math.random() * bounds.max_y - bounds.min_y)]
      }, true)
      num -= 1
      log.debug('Spawned a "' + e.powerup_type + '" powerup')
    }
    return setTimeout(addPowerups, POWERUP_SPAWN_FREQUENCY)
  }
  var game = new Game({
    sim: simulation
  })

  net.setupServer(httpServer, simulation)
  addPowerups()
  game.mainLoop()
}
