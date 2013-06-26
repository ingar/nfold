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

// Regenerates our quadtree with newly-position entities
World.prototype.beginQueries = function () {
  this.quadtree = collide.QuadTree(this.bounds, {
    max_depth: 5,
    threshold: 8
  })
  _.each(this.entities, function(ent) {
    this.quadtree.insert(ent.collide)
  }, this)
}

World.prototype.eachIntersectingEntity = function(collide, fn) {
  this.quadtree.each_object(collide, function(other) {
    fn(other.entity)
  })
}

World.prototype.add = function (entity) {
  this.entities[entity.id] = entity

  // TODO: move this logic (and make a flag for this)
  if (entity.local_player) {
    this.localPlayer = entity
  }
  return entity
}

World.prototype.remove = function (entity) {
  delete this.entities[entity.id]

  // TODO: move this logic (and make a flag for this)
  if (entity.local_player) {
    this.localPlayer = null
  }
  return entity
}

World.prototype.get = function (entityId) {
  return this.entities[entityId]
}

World.prototype.allEntities = function (cb) {
  _.each(this.entities, cb)
}

World.prototype.clear = function () {
  this.entities = {}
}

World.prototype.randomLocation = function () {
  return [
    Math.random() * (this.opts.width) + this.opts.minX,
    Math.random() * (this.opts.height) + this.opts.minY
  ]
}

World.prototype.updateEntity = function (id, fn) {
  var entity = this.get(id)
  if (entity) {
    fn(entity)
  }
  return entity
}

exports.World = World

