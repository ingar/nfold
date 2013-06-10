(function(exports) {

  DEBUG    = 10
  INFO     = 20
  WARNING  = 30
  ERROR    = 30
  CRITICAL = 40

  var curLevel = DEBUG

  function logFn(level) {
    return function(s) {
      exports.log(level, s)
    }
  }

  exports.setLevel = function(level) {
    curLevel = level
  }

  exports.log = function(level, s) {
    if (level >= curLevel) {
      console.log((new Date) + ' ' + s)
    }
  }

  exports.debug = logFn(DEBUG)
  exports.info  = logFn(INFO)
  exports.warn  = logFn(WARNING)
  exports.error = logFn(ERROR)
  exports.crit  = logFn(CRITICAL)

  exports.DEBUG    = DEBUG
  exports.INFO     = INFO
  exports.WARNING  = WARNING
  exports.ERROR    = ERROR
  exports.CRITICAL = CRITICAL

})(typeof exports === 'undefined' ? this['log']={} : exports)
