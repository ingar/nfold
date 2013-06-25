var _ = require('underscore')
var collide = require('./collide')

var DEFAULT_OPTS = {
  minX: 0,
  minY: 0,
  width: 256,
  height: 256
}

function World(opts) {
  var options = _.extend(DEFAULT_OPTS, opts)
  _.extend(this, {
    opts: options,
    entities: {},
    bounds: collide.AABB(options.minX, options.minY, options.minX + options.width, options.minY + options.height),
    localPlayer: null
  })
}

_.extend(World.prototype, {
  add: function(entity) {
    this.entities[entity.id] = entity

    // TODO: move this logic (and make a flag for this)
    if (entity.local_player) {
      this.localPlayer = entity
    }
    return entity
  },

  remove: function(entity) {
    delete this.entities[entity.id]

    // TODO: move this logic (and make a flag for this)
    if (entity.local_player) {
      this.localPlayer = null
    }
    return entity
  },

  get: function(entityId) {
    return this.entities[entityId]
  },

  eachEntity: function(cb) {
    _.each(this.entities, cb)
  },

  clear: function() {
    this.entities = {}
  },

  randomLocation: function() {
    return [
      Math.random() * (this.opts.width) + this.opts.minX,
      Math.random() * (this.opts.height) + this.opts.minY
    ]
  }
})

exports.World = World

