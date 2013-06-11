if (typeof window === 'undefined') {
  var _ = require('underscore')
  require('./math')
  var pubsub = require('./pubsub')
  var collide = require('./collide')
  var entity = require('./entity')
  var world = require('./world')
}

(function(exports) {
  
  // TODO: Inject this into game
  var gameWorld = new world.World()

  var setupSimulationEvents = function(sim) {
    pubsub.subscribe('damage', function(data) {
      return sim.net.broadcast('entity_update', {
        id: data.entity.id,
        health: data.entity.health
      })
    })
    pubsub.subscribe('killed', function(entity_id) {
      return sim.net.broadcast('kill', entity_id)
    })

    var last_local_player_broadcast = 0
    pubsub.subscribe('sim_endframe', function(sim) {
      var t, update_data
      var localPlayer = sim.getWorld().localPlayer
      if (localPlayer) {
        t = (new Date).getTime()
        if (t - last_local_player_broadcast >= 50) {
          update_data = _.extend(localPlayer.position_data(), {
            name: localPlayer.name
          })
          sim.net.broadcast('entity_update', update_data)
          return last_local_player_broadcast = t
        }
      }
    })
    pubsub.subscribe('entity:add_powerup', function(data) {
      return sim.getWorld[data.entity_id].add_powerup(data.powerup_type)
    })
  }

  var Simulation = function(opts) {
    var collidees = []

    var create_quadtree = function() {
      return collide.QuadTree(gameWorld.bounds, {
        max_depth: 5,
        threshold: 8
      })
    }

    var sim = {
      type: exports.SERVER,
      collide_type: collide.CLIENT,
      quadtree: create_quadtree(),
      broadcast_entities: [],
      net: {
        broadcast: function() {},
        send: function() {}
      },

      tick: function(game) {
        var elapsedSecs = game.frameTime * 0.001
        var self = this
        self.quadtree = create_quadtree()
        collidees = []

        gameWorld.eachEntity(function(o) {
          o._simulate(elapsedSecs, self)
          if (o.remove_me) {
            return gameWorld.remove(o)
          } else {
            self.quadtree.insert(o.collide)
            if ((self.type === exports.SERVER && (o.flags & entity.COLLIDE_SERVER)) || (self.type === exports.CLIENT && (o.flags & entity.COLLIDE_CLIENT))) {
              return collidees.push(o)
            }
          }
        })

        self.check_collisions(collidees)
        if (this.broadcast_entities.length > 0) {
          this.net.broadcast('new_entities', _.map(this.broadcast_entities, function(o) {
            return o.serialize()
          }))
        }
        pubsub.publish('sim_endframe', self)
        this.broadcast_entities = []
      },

      check_collisions: function(players) {
        var self
        self = this
        return _.each(players, function(player) {
          return self.quadtree.each_object(player.collide, function(collidee) {
            var e, handler
            e = collidee.entity
            handler = e[('collide_' + player.type).toLowerCase()]
            if ((handler != null) && e !== player && e.owner !== player.id) {
              return handler.call(e, player)
            }
          })
        })
      },
      find_entity: function(id) {
        return gameWorld.get(id)
      },

      spawn: function(opts, broadcast) {
        var e
        e = entity.create(_.extend({
          sim: this
        }, opts))
        if ((this.type === exports.CLIENT && !(e.flags & entity.SPAWN_CLIENT)) || (this.type === exports.SERVER && !(e.flags & entity.SPAWN_SERVER))) {
          return
        }
        gameWorld.add(e)
        e.spawn()
        if (broadcast) {
          this.broadcast_entities.push(e)
        }
        return e
      },
      deserialize: function(opts) {
        return gameWorld.add(entity.create(_.extend({
          sim: this
        }, opts)))
      },

      kill: function(id, broadcast) {
        var o = gameWorld.get(id)
        if (o) {
          o.kill()

          // TODO: move this
          if (broadcast) {
            return this.net.broadcast('kill', o.id)
          }
        }
      },
      update_entity: function(data) {
        var o = gameWorld.get(data.id)
        if (o) {
          return _.extend(o, data)
        }
      },
      synchronize: function(entities) {
        gameWorld.clear()
        return _.each(entities, (function(opts) {
          return this.deserialize(opts)
        }), this)
      },
      get_objects: function() {
        // TODO: don't reach into gameWorld
        return _.values(gameWorld.entities)
      },
      each_entity: function(bounds, fn) {
        return this.quadtree.each_object(bounds, function(o) {
          return fn(o.entity)
        })
      },
      getWorld: function() { return gameWorld },
      
      world_bounds: function() {
        return gameWorld.bounds
      },
      randomLocation: function() {
        return gameWorld.randomLocation()
      }
    }

    setupSimulationEvents(sim)

    return _.extend(sim, opts)
  }

  exports.SERVER = 'server'
  exports.CLIENT = 'client'

  exports.Simulation = Simulation

})(typeof exports === 'undefined' ? this.simulation={} : exports)
