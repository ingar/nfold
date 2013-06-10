if (typeof window === 'undefined') {
  var log = require('../common/log')
}

(function(exports) {

  function Game(opts) {
    var defaults = {
      tickInterval: 20,
      preRender: function() {},
      postRender: function() {}
    }
    _.extend(this, defaults, opts)
  }

  _.extend(Game.prototype, {
    mainLoop: function() {
      var self = this
      var lastLoopTime = (new Date).getTime()

      function loop() {
        var startTime = (new Date).getTime()
        self.frameTime = startTime - lastLoopTime

        self.sim.tick(self)
        self.preRender(self)
        if (self.renderer) {
          self.renderer.renderScene(self)
        }
        self.postRender(self)

        var elapsed = (new Date).getTime() - startTime
        setTimeout(loop, Math.max(self.tickInterval - elapsed, 0))
        lastLoopTime = startTime
      }

      loop()
    }
  })

  exports.Game = Game

})(typeof exports === 'undefined' ? this['game']={} : exports)

