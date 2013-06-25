var _ = require('underscore')
require('./math')
var pubsub = require('./pubsub')
var collide = require('./collide')
var Entity = require('./entity/base').Entity
var entity = require('./entity/entity')
var world = require('./world')

function Simulation(opts) {

  this.world = new world.World() // TODO: Inject this into game
  this.quadtree = this._createQuadtree()

  _.extend(this, {
    type: exports.SERVER,
    collide_type: collide.CLIENT,
    broadcast_entities: [],
    net: {
      broadcast: function() {},
      send: function() {}
    }
  }, opts)

  this._setupSimulationEvents(this)
}

Simulation.prototype.tick = function(game) {
  var collidees = []
  var self = this
  var elapsedSecs = game.frameTime * 0.001
  self.quadtree = this._createQuadtree()

  this.world.eachEntity(function(ent) {
    ent._simulate(elapsedSecs, self)
    if (ent.remove_me) {
      self.world.remove(ent)
    } else {
      self.quadtree.insert(ent.collide)
      if ((self.type === exports.SERVER && (ent.flags & Entity.COLLIDE_SERVER)) || (self.type === exports.CLIENT && (ent.flags & Entity.COLLIDE_CLIENT))) {
        collidees.push(ent)
      }
    }
  })

  self.checkCollisions(collidees)
  if (this.broadcast_entities.length > 0) {
    this.net.broadcast('new_entities', _.map(this.broadcast_entities, function(o) { return o.serialize() }))
  }
  pubsub.publish('sim_endframe', self)
  this.broadcast_entities = []
}


Simulation.prototype.checkCollisions = function(players) {
  var self = this
  _.each(players, function(player) {
    self.quadtree.each_object(player.collide, function(collidee) {
      var ent = collidee.entity
      var handler = ent[('collide_' + player.type).toLowerCase()]
      if ((handler != null) && ent !== player && ent.owner !== player.id) {
        handler.call(ent, player)
      }
    })
  })
}

Simulation.prototype.findEntity = function(id) {
  return this.world.get(id)
}

Simulation.prototype.spawn = function(opts, broadcast) {
  var ent = entity.create(_.extend({ sim: this }, opts))

  if ((this.type === exports.CLIENT && !(ent.flags & Entity.SPAWN_CLIENT)) || (this.type === exports.SERVER && !(ent.flags & Entity.SPAWN_SERVER))) {
    return
  }
  this.world.add(ent)
  ent.spawn()
  if (broadcast) {
    this.broadcast_entities.push(ent)
  }
  return ent
}

Simulation.prototype.deserialize = function(opts) {
  this.world.add(entity.create(_.extend({ sim: this }, opts)))
}

Simulation.prototype.kill = function(id, broadcast) {
  var ent = this.world.get(id)
  if (ent) {
    ent.kill()

    // TODO: move this
    if (broadcast) {
      return this.net.broadcast('kill', ent.id)
    }
  }
}

Simulation.prototype.updateEntity = function(data) {
  this.world.updateEntity(data.id, function(ent) {
    _.extend(ent, data)
  })
}

Simulation.prototype.synchronize = function(ents) {
  this.world.clear()
  _.each(ents, (function(opts) {
    this.deserialize(opts)
  }), this)
}

Simulation.prototype.getObjects = function() {
  // TODO: don't reach into gameWorld
  return _.values(this.world.entities)
}

Simulation.prototype.eachEntity = function(bounds, fn) {
  this.quadtree.each_object(bounds, function(o) {
    fn(o.entity)
  })
}

Simulation.prototype.getWorld = function() { return this.world }

Simulation.prototype.world_bounds = function() {
  return this.world.bounds
}

Simulation.prototype.randomLocation = function() {
  return this.world.randomLocation()
}

Simulation.prototype._setupSimulationEvents = function(sim) {
  pubsub.subscribe('damage', function(data) {
    sim.net.broadcast('entity_update', {
      id: data.entity.id,
      health: data.entity.health
    })
  })

  pubsub.subscribe('killed', function(entity_id) {
    sim.net.broadcast('kill', entity_id)
  })

  var last_local_player_broadcast = 0
  pubsub.subscribe('sim_endframe', function(sim) {
    var t, update_data
    var localPlayer = sim.getWorld().localPlayer
    if (localPlayer) {
      t = (new Date).getTime()
      if (t - last_local_player_broadcast >= 50) {
        update_data = _.extend(localPlayer.positionData(), {
          name: localPlayer.name
        })
        sim.net.broadcast('entity_update', update_data)
        last_local_player_broadcast = t
      }
    }
  })

  pubsub.subscribe('entity:add_powerup', function(data) {
    sim.getWorld[data.entity_id].add_powerup(data.powerup_type)
  })
}

Simulation.prototype._createQuadtree = function() {
  return collide.QuadTree(this.world.bounds, {
    max_depth: 5,
    threshold: 8
  })
}

exports.SERVER = 'server'
exports.CLIENT = 'client'

exports.Simulation = Simulation