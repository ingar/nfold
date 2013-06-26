var _ = require('underscore')
require('./math')
var pubsub = require('./pubsub')
var Entity = require('./entity/base').Entity
var entity = require('./entity/entity')
var world = require('./world')

function Simulation(opts) {

  _.extend(this, {
    type: Simulation.SERVER,
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

  this.world.allEntities(function(ent) {
    ent._simulate(elapsedSecs, self)
    if (ent.remove_me) {
      self.world.remove(ent)
    } else {
      if ((self.type === Simulation.SERVER && (ent.flags & Entity.COLLIDE_SERVER)) || (self.type === Simulation.CLIENT && (ent.flags & Entity.COLLIDE_CLIENT))) {
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
  self.world.beginQueries()
  _.each(players, function(player) {
    self.world.eachIntersectingEntity(player.collide, function(ent) {
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

  if ((this.type === Simulation.CLIENT && !(ent.flags & Entity.SPAWN_CLIENT)) || (this.type === Simulation.SERVER && !(ent.flags & Entity.SPAWN_SERVER))) {
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

Simulation.prototype._setupSimulationEvents = function(sim) {
  pubsub.subscribe('damage', function(data) {
    sim.net.broadcast('entity_update', {
      id: data.entity.id,
      health: data.entity.health
    })
  })

  pubsub.subscribe('killed', function(id) {
    sim.net.broadcast('kill', id)
  })

  var last_local_player_broadcast = 0
  pubsub.subscribe('sim_endframe', function(sim) {
    var t, update_data
    var localPlayer = sim.world.localPlayer
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
}

Simulation.SERVER = 'server'
Simulation.CLIENT = 'client'

exports.Simulation = Simulation