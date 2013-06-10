function initClientNetwork(sim, clientId) {
  var socket = io.connect()

  function network_message(msg, fn) {
    socket.on(msg, function(payload) {
      if (nfold.debug.net && msg !== 'entity_update') { console.log('RECV: %s, %o', msg, payload ? payload.data : null) }
      fn(payload ? payload.data : null)
    })
  }

  sim.net.broadcast = function(msg, data) {
    if (nfold.debug.net && msg !== 'entity_update') { console.log('SEND: %s, %o', msg, data) }
    socket.emit(msg, { data: data, broadcast: true })
  }

  network_message('connect', function() {
    sim.net.broadcast('hello', clientId)
  })

  network_message('sync', function(data) {
    sim.synchronize(data)
  })

  network_message('entity_update', function(data) {
    sim.update_entity(data)
  })

  network_message('new_entities', function(data) {
    _.each(data, function(opts) {
      sim.deserialize(opts)
    })
  })

  network_message('kill', function(id) {
    sim.kill(id)
  })

  network_message('chat', function(data) {
    pubsub.publish('chat', data)
  })
}

