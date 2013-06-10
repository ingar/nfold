function InputManager() {
  var keys = []

  $(document).keydown(function(e) {
    keys[e.keyCode] = true
  })

  $(document).keyup(function(e) {
    keys[e.keyCode] = false
  })

  this.isPressed = function(keyCode) {
    return keys[keyCode]
  }
}