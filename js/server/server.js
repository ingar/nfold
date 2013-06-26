var NFold = require('../common/nfold').NFold
var net = require('./net')

exports.startup = function(httpServer) {
  var nfold = new NFold(true)
  net.setupServer(httpServer, nfold.sim)
  nfold.run()
}