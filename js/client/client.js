var _ = require('underscore')._
var pubsub = require('../common/pubsub')
var InputManager = require('./input').InputManager
var CanvasRenderer = require('./canvas_renderer').CanvasRenderer
var net = require('./net')
var NFold = require('../common/nfold').NFold

function GameClient() {
  var self = this

  this.clientId = 'client:' + Math.round(Math.random() * 0xFFFFFFFF).toString(16)
  this.input = new InputManager()
  this.player = null
  this.renderer = new CanvasRenderer(document.querySelector('.main canvas'))

  this.nfold = new NFold(false, {
    renderer: this.renderer,
    preRender: function() {
      self.handleInput()
      self.updateViewport()
    },
    postRender: function() {
      self.renderDebug()
    }
  })

  this.initNetwork()
  this.initEvents()
  this.nfold.run()
}

GameClient.prototype.initNetwork = function() {
  net.initClientNetwork(this.nfold.sim, this.clientId)
}

GameClient.prototype.initEvents = function() {
  var self = this
  pubsub.subscribe('killed', function(data) {
    if (self.player && self.player.id === data.id) {
      self.player = null
    }
  })

  pubsub.subscribe('new_chat', function(data) {
    self.nfold.sim.net.broadcast('chat', data)
    pubsub.publish('chat', data)
  })
}

GameClient.prototype.handleInput = function() {
  if (!this.isPlaying()) {
    return
  }

  var frameTime = this.nfold.game.frameTime * 0.001
  var player = this.player
  var input = this.input

  player.acceleration = [0, 0]
  if (input.isPressed(37)) { player.rotateLeft(frameTime) }
  if (input.isPressed(39)) { player.rotateRight(frameTime) }
  if (input.isPressed(38)) { player.forwardThrust() }
  if (input.isPressed(40)) { player.reverseThrust() }
  if (input.isPressed(32)) { player.fire() }
}

GameClient.prototype.updateViewport = function(game) {
  if (this.player) {
    this.renderer.centerOn(this.player)
  }
}

GameClient.prototype.renderDebug = function() {
  if (nfold_opts.debug_quadtrees || nfold_opts.debug_collisions) {
    var collide_things = [this.nfold.world.bounds]
    this.nfold.world.quadtree.each_node(this.nfold.world.bounds, function(node) {
      if (nfold_opts.debug_quadtrees) collide_things.push(node.extents)
      if (nfold_opts.debug_collisions) {
        _.each(node.objects, function(o) {
          collide_things.push(o)
        })
      }
    })
    this.renderer.renderCollisionDebug(collide_things)
  }
}

GameClient.prototype.joinGame = function(name) {
  if (this.player) {
    return
  }
  this.player = this.nfold.sim.spawn({
    id: this.clientId,
    type: 'Player',
    local_player: true,
    debug: false,
    name: name,
    position: this.nfold.world.randomLocation()
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

exports.GameClient = GameClient