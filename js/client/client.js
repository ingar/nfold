function GameClient() {
  var self = this

  this.clientId = 'client:' + Math.round(Math.random() * 0xFFFFFFFF).toString(16)
  this.input = new InputManager()
  this.sim = simulation.Simulation({ type: simulation.CLIENT })
  this.player = null

  this.initRender()
  this.initNetwork()
  this.initEvents()

  this.game = new game.Game({
    sim: this.sim,
    renderer: render,
    preRender: function() {
      self.handleInput()
      self.updateViewport()
    },
    postRender: function() {
      self.renderDebug()
    },
    renderOptions: {
      ctx: this.ctx,
      viewport: this.viewport
    }
  })

  this.game.mainLoop()
}

GameClient.prototype.initNetwork = function() {
  initClientNetwork(this.sim, this.clientId)
}

GameClient.prototype.initEvents = function() {
  var self = this
  pubsub.subscribe('killed', function(entity_id) {
    if (self.player && self.player.id === entity_id) {
      self.player = null
    }
  })

  pubsub.subscribe('new_chat', function(data) {
    self.sim.net.broadcast('chat', data)
    pubsub.publish('chat', data)
  })
}

GameClient.prototype.handleInput = function() {
  if (!this.isPlaying()) {
    return
  }

  var frameTime = this.game.frameTime * 0.001
  var player = this.player
  var input = this.input

  if (input.isPressed(37)) { player.rotateLeft(frameTime) }
  if (input.isPressed(39)) { player.rotateRight(frameTime) }
  if (input.isPressed(38)) { player.forwardThrust() }
  if (input.isPressed(40)) { player.reverseThrust() }
  if (input.isPressed(32)) { player.fire() }
}

GameClient.prototype.updateViewport = function(game) {
  if (this.player) {
    this.viewport.update_cwh(this.player.position, this.width, this.height)
  }
}

GameClient.prototype.initRender = function() {
  var $canvas = $('.main canvas')
  this.ctx = $canvas[0].getContext('2d')
  this.width = $canvas.width()
  this.height = $canvas.height()
  this.viewport = collide.AABB(0, 0, this.width, this.height)
}

GameClient.prototype.renderDebug = function() {
  if (nfold.debug.quadtrees || nfold.debug.collisions) {
    var sim = this.sim
    var collide_things = [sim.world_bounds()]
    sim.quadtree.each_node(sim.world_bounds(), function(node) {
      if (nfold.debug.quadtrees) collide_things.push(node.extents)
      if (nfold.debug.collisions) {
        _.each(node.objects, function(o) {
          collide_things.push(o)
        })
      }
    })
    render.render_collision_geometry(this.ctx, this.viewport, collide_things)
  }
}

GameClient.prototype.joinGame = function(name) {
  if (this.player) {
    return
  }

  this.player = this.sim.spawn({
    id: this.clientId,
    type: 'Player',
    local_player: true,
    debug: false,
    name: name,
    position: this.sim.randomLocation()
  }, true)
}

GameClient.prototype.isPlaying = function() {
  return this.player !== null
}

GameClient.prototype.setName = function(name) {
  if (this.player) {
    this.player.name = name
  }
}