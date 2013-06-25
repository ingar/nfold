var _ = require('underscore')._
var collide = require('../common/collide')
var nfold = require('./config').nfold

var entityRenderers = {}

function CanvasRenderer(canvas) {
  this.ctx = canvas.getContext('2d')
  this.viewport = collide.AABB(0, 0, canvas.width, canvas.height)
}

CanvasRenderer.prototype.renderScene = function(game) {
  var self = this
  var ctx = this.ctx
  var sim = game.sim

  ctx.save()

  ctx.fillStyle = nfold.background_color
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  var view = this.viewport
  ctx.translate(-view.min_x, -view.min_y)

  // Draw background
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 1

  for (var x = (view.min_x - view.min_x % 50); x < view.max_x; x += 50) {
    ctx.moveTo(x, view.min_y)
    ctx.lineTo(x, view.max_y)
  }
  for (var y = (view.min_y - view.min_y % 50); y < view.max_y; y += 50) {
    ctx.moveTo(view.min_x, y)
    ctx.lineTo(view.max_x, y)
  }
  ctx.stroke()

  // draw boundary of the world
  ctx.strokeStyle = 'gray'
  var world_bounds = sim.world_bounds()
  ctx.strokeRect(
    world_bounds.min_x,
    world_bounds.min_y,
    world_bounds.max_x - world_bounds.min_x,
    world_bounds.max_y - world_bounds.min_y
  )

  var render_count = 0
  sim.eachEntity(view, function(entity) {
    self.renderEntity(entity, ctx)
    render_count += 1
  })
  ctx.restore()
}

CanvasRenderer.prototype.renderEntity = function(entity, ctx) {
  var renderFn = entityRenderers[entity.type.toLowerCase()] || entityRenderers.debug
  this._prerender(entity)
  renderFn(entity, ctx)
  this._postrender(entity)
}

CanvasRenderer.prototype.centerOn = function(entity) {
  this.viewport.setCenter(entity.position)
}

CanvasRenderer.prototype.render_collision_geometry = function(collision_objects) {
  var ctx = this.ctx
  ctx.save()
  ctx.translate(-this.viewport.min_x, -this.viewport.min_y)
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 0.5
  ctx.fillStyle = '#0ff'
  ctx.strokeStyle = '#0ff'
  _.each(collision_objects, function(c) {
    if (c.collide_type === 'aabb') {
      ctx.strokeRect(c.min_x, c.min_y, c.max_x - c.min_x, c.max_y - c.min_y)
    } else if (c.collide_type === 'point') {
      ctx.beginPath()
      var r = 4
      ctx.moveTo(c.x-r, c.y-r)
      ctx.lineTo(c.x+r, c.y+r)
      ctx.moveTo(c.x+r, c.y-r)
      ctx.lineTo(c.x-r, c.y+r)
      ctx.stroke()
    }
  })
  ctx.restore()
}

CanvasRenderer.prototype._prerender = function(entity) {
  var ctx = this.ctx
  ctx.save()
  ctx.translate.apply(ctx, entity.position)
  if (entity.type === 'Player') {
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(entity.name + ' (' + entity.health.toFixed(1) + ')', 0, 20)
  }
  ctx.rotate(entity.rotation)
}

CanvasRenderer.prototype._postrender = function() {
  this.ctx.restore()
}

function _radial_powerup(n) {
  return function(o, ctx) {
    var offset = ((new Date).getTime()/500) % (2*Math.PI)
    ctx.fillStyle = 'rgba(255,161,4,1)'
    ctx.lineWidth = 2
    for (var i=0; i<n; i++) {
      ctx.save()
      ctx.rotate(i * 2*Math.PI / n + offset)
      ctx.translate(0, 5)
      _circle(ctx, 2, 'rgba(3,173,235,1)')
      ctx.stroke()
      ctx.fill()
      ctx.restore()
    }
  }
}

function _circle(ctx, radius, color) {
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
}


entityRenderers.player = function(o, ctx) {
  var local_player_color = [255,255,255]
  var remote_player_color = [128,128,128]
  var damaged_color = [255,0,0]

  ctx.lineWidth = 1

  var cur_color = vec3.lerp(
    damaged_color,
    o.local_player ? local_player_color : remote_player_color,
    o.health / o.max_health
  )

  ctx.strokeStyle = 'rgb(' + _.map(cur_color, Math.round).join(',') + ')'

  ctx.beginPath()
  var r = o.radius
  ctx.moveTo(0, r)
  ctx.lineTo(0, 0)
  ctx.lineTo(-r, -r)
  ctx.lineTo(0, r)
  ctx.lineTo(r, -r)
  ctx.lineTo(0, 0)
  ctx.closePath()

  ctx.stroke()
}

entityRenderers.projectile = function(o, ctx) {
  var render_radius = 2.5
  ctx.fillStyle = '#fff'
  ctx.lineWidth = Math.round(render_radius * 0.5).toString()
  _circle(ctx, render_radius, 'rgba(255,141,0,1)')
  ctx.fill()
  ctx.stroke()
}

entityRenderers.explosion = function(o, ctx) {
  ctx.fillStyle = 'rgba(255,141,0,' + (1.0 - o.age / o.lifespan).toFixed(1) + ')'
  _circle(ctx, o.render_radius)
  ctx.fill()
}

entityRenderers.powerup_doublerate = function(o, ctx) {
  ctx.lineWidth = 1
  ctx.fillStyle = 'rgba(3,173,235,1)'
  _circle(ctx, 2)
  ctx.fill()
  _circle(ctx, 8, 'rgba(3,173,235,1)')
  ctx.stroke()
}

entityRenderers.powerup_awesomeness = function(o, ctx) {
  entityRenderers.powerup_nonagun(o, ctx)
  entityRenderers.powerup_doublerate(o, ctx)
}

entityRenderers.powerup_nonagun = _radial_powerup(5)
entityRenderers.powerup_doublespread = _radial_powerup(2)
entityRenderers.powerup_triplespread = _radial_powerup(3)

entityRenderers.debug = function(o, ctx) {
  ctx.lineWidth = 2
  _circle(ctx, o.radius, 'green')
  ctx.stroke()
}


exports.CanvasRenderer = CanvasRenderer

