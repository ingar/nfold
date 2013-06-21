// TODO: Change calling convention (pass in entity)
exports.none = function(dt, sim) {}

// TODO: Change calling convention (pass in entity)
exports.standard = function(dt, sim) {
  var drag, newPos, speed, worldBounds

  if (vec2.nonzero(this.acceleration)) {
    this.velocity = vec2.add(this.velocity, vec2.scale(this.acceleration, dt))
  }

  if (this.angular_velocity !== 0) {
    this.rotation += rangewrap(this.rotation + this.angular_velocity * dt)
  }

  if (vec2.nonzero(this.velocity)) {

    worldBounds = sim.world_bounds()

    if (this.drag_coefficient) {
      speed = vec2.length(this.velocity)
      drag = vec2.scale(vec2.normalize(this.velocity), -speed * speed * this.drag_coefficient)
      this.velocity = vec2.add(this.velocity, vec2.scale(drag, dt))
    }

    newPos = vec2.add(this.position, vec2.scale(this.velocity, dt))

    this.position = [rangelimit(newPos[0], worldBounds.min_x, worldBounds.max_x - 0.00001), rangelimit(newPos[1], worldBounds.min_y, worldBounds.max_y - 0.00001)]

    // Stop x/y velocity when we hit the world bounds
    if (this.position[0] === worldBounds.min_x || this.position[0] === worldBounds.max_x) {
      this.velocity[0] = 0
    }

    if (this.position[1] === worldBounds.min_y || this.position[1] === worldBounds.max_y) {
      this.velocity[1] = 0
    }
  }
}