var express = require('express');

var app = module.exports = express();
var server = require('./js/server/server');

// Configuration
//
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'n &bull; fold',
    layout: false
  });
});

httpServer = require('http').createServer(app)
server.startup(httpServer);

PORT = 3000
httpServer.listen(PORT);
console.log("Express server listening on port %d in %s mode", PORT, app.settings.env);