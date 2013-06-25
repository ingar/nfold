require('./entity/explosion')
require('./entity/player')
require('./entity/powerup')
require('./entity/projectile')

var _ = require('underscore')._
var log = require('../common/log')

function Game(opts) {
  var defaults = {
    tickInterval: 20,
    frameTime: 0,
    sim: null,
    world: null,
    preRender: function() {},
    postRender: function() {}
  }
  _.extend(this, defaults, opts)
}

function _getCurrentTimeMs() {
  return (new Date).getTime()
}

Game.prototype.mainLoop = function() {
  var self = this
  var loopEndTime = _getCurrentTimeMs()

  function loop() {
    var loopStartTime = _getCurrentTimeMs()
    self.frameTime = loopStartTime - loopEndTime

    self.sim.tick(self)
    self.preRender(self)
    if (self.renderer) {
      self.renderer.renderScene(self)
    }
    self.postRender(self)

    loopEndTime = _getCurrentTimeMs()
    var elapsed = loopEndTime - loopStartTime
    setTimeout(loop, Math.max(self.tickInterval - elapsed, 0))
  }
  loop()
}

exports.Game = Game

