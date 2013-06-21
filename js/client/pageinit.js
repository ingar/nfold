var _ = require('underscore')._
var pubsub = require('../common/pubsub')
var GameClient = require('./client').GameClient
var nfold = require('./config').nfold

$(function() {

  var client = new GameClient()
  var playerName = 'player'

  $('span.client-id').html(client.clientId)
  $('input[name=player_name]').val(playerName)

  $(document).keydown(function(e) {
    if (e.keyCode == 32) {  // space
      e.preventDefault()
      client.joinGame(playerName)
    } else if (e.keyCode === 84) {  // 't'
      e.preventDefault()
      $('form#chat input[name=say_what]').focus()
    } else if (e.keyCode === 72) {  // 'h'
      $('.help').toggle()
    }
  })

  $('form#set-name').keydown(function(e) { e.stopPropagation() })
  $('form#set-name').submit(function(e) {
    e.preventDefault()
    var $input = $('input[name=player_name]').blur()
    var new_name = $input.val().trim()
    if (new_name.length === 0) {
      $input.val(playerName) // invalid, set it back
    } else {
      playerName = new_name
      client.setName(playerName)
    }
  })

  $('form#chat').keydown(function(e) {
    if (e.keyCode == 27) { $('input', this).blur() }
    e.stopPropagation()
  })

  $('form#chat').submit(function(e) {
    e.preventDefault()
    var $input = $('input[name=say_what]', this).blur()
    var chat_string = $input.val().trim()
    if (chat_string.length > 0) {
      pubsub.publish('new_chat', {
        sender: playerName,
        entity_id: client.player ? client.player.id : null,
        text: chat_string
      })
    }
    $input.val('')
  })

  $('input.debug:checkbox').change(function() {
    var key = $(this).val()
    nfold.debug[key] = $(this).is(':checked')
  })

  pubsub.subscribe('chat', function(data) {
    $('.chat_messages').prepend(_.template('<p><strong><%= sender %>:</strong> <%= text %></p>', data))
  })
})
