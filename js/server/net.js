var _ = require('underscore')._
var socketio = require('socket.io')
var log = require('../common/log')
var commands = require('./commands')

var DEBUG_NET = false

exports.setupServer = function(httpServer, sim) {
  var io = socketio.listen(httpServer)
  io.configure(function() {
    io.set('transports', ['websocket'])
    return io.set('log level', 1)
  })
  sim.net.broadcast = function(msg, data) {
    if (DEBUG_NET && msg !== 'entity_update') {
      console.log('SEND: %s, %j', msg, data)
    }
    return io.sockets.emit(msg, {
      data: data,
      broadcast: false
    })
  }
  io.sockets.on('connection', function(socket) {
    var network_message
    network_message = function(msg, fn) {
      return socket.on(msg, function(payload) {
        payload = payload || {}
        fn(payload.data, payload)
        if (DEBUG_NET && msg !== 'entity_update') {
          console.log('RECV: %s, %j', msg, payload)
        }
        if (payload.broadcast) {
          return socket.broadcast.emit(msg, payload)
        }
      })
    }
    socket.emit('sync', {
      data: _.map(_.values(sim.world.entities), function(o) {
        return o.serialize()
      })
    })
    network_message('hello', function(data) {
      socket.set('clientId', data)
      return log.debug("Client " + data + " connected from " + socket.handshake.address.address)
    })
    network_message('disconnect', function() {
      return socket.get('clientId', function(err, clientId) {
        return sim.kill(clientId, true)
      })
    })
    network_message('entity_update', function(data) {
      return sim.updateEntity(data)
    })
    network_message('new_entities', function(data) {
      return _.each(data, function(opts) {
        return sim.deserialize(opts)
      })
    })
    return network_message('chat', function(data, payload) {
      var tokens
      if (data.text[0] === '/') {
        tokens = _.compact(data.text.split(/\s+/))
        payload.broadcast = false
        return commands.handle_command.call(this, socket, sim, data.sender, data.entity_id, tokens[0].slice(1), tokens.slice(1))
      }
    })
  })
}

