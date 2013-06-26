require('./entity/explosion')
require('./entity/player')
require('./entity/powerup')
require('./entity/projectile')

var _ = require('underscore')._

function _getCurrentTimeMs() {
  return (new Date).getTime()
}

function Game(opts) {
  _.extend(this, {
    tickInterval: 20,
    frameTime: 0,
    sim: null,
    world: null,
    preRender: function() {},
    postRender: function() {}
  }, opts)
}

Game.prototype.mainLoop = function() {
  var self = this
  var loopEndTime = _getCurrentTimeMs()

  function loop() {
    self.curTime = _getCurrentTimeMs()
    self.frameTime = self.curTime - loopEndTime

    self.sim.tick(self)
    self.preRender(self)
    if (self.renderer) {
      self.renderer.renderScene(self)
    }
    self.postRender(self)

    loopEndTime = _getCurrentTimeMs()
    var elapsed = loopEndTime - self.curTime
    setTimeout(loop, Math.max(self.tickInterval - elapsed, 0))
  }
  loop()
}

exports.Game = Game