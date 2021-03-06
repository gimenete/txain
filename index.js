module.exports = function(f) {
  var tx = {}
  var chain = []
  var end = null
  var values = {}
  var initial = null

  function isPromise(promise) {
    return promise
      && typeof promise.then === 'function'
      && typeof promise.catch === 'function'
  }

  function callNext() {
    var f = chain.shift()
    if (!f) {
      end.apply(tx, arguments)
    } else {
      var args = Array.prototype.slice.call(arguments)
      var err = args.shift()
      if (err) {
        end.call(tx, err)
      } else {
        if (!f.debug) {
          // remove arguments if needed
          if (args.length >= f.length) {
            args = args.splice(0, f.length - 1)
          } else {
            // add arguments if needed
            for (var i = args.length; i < f.length - 1; i++) {
              args.push(void 0)
            }
          }
        }
        args.push(callNext)
        var promise = f.apply(tx, args)
        if (isPromise(promise)) {
          promise.then(function() {
            callNext.apply(tx, [null].concat(Array.prototype.slice.call(arguments)))
          }).catch(callNext)
        }
      }
    }
  }

  function collect(args, collector, finish) {
    args = Array.prototype.slice.call(args)
    var f = args.shift()
    chain.push(function(items, callback) {
      var i = 0
      function next() {
        if (items.length > i) {
          var item = items[i++]
          var argmnts = [item].concat(args)
          var cb = function(err, value) {
            if (err) return end.call(tx, err)
            var stop = collector(item, value)
            if (stop) {
              finish(callback)
            } else {
              process.nextTick(next) // avoid exceeding maximum call stack size
            }
          }
          argmnts.push(cb)
          var promise = f.apply(null, argmnts)
          if (isPromise(promise)) {
            promise.then(function() {
              cb.apply(null, [null].concat(Array.prototype.slice.call(arguments)))
            }).catch(cb)
          }
        } else {
          finish(callback)
        }
      }
      next()
    })
  }

  tx.each = function(f) {
    collect(arguments,
      function(item, value) {},
      function(callback) {
        callback(null)
      }
    )
    return tx
  }

  tx.map = function(f) {
    var result = []
    collect(arguments,
      function(item, value) {
        result.push(value)
      },
      function(callback) {
        callback(null, result)
      }
    )
    return tx
  }

  tx.reject = function(f) {
    var result = []
    collect(arguments,
      function(item, value) {
        if (!value) {
          result.push(item)
        }
      },
      function(callback) {
        callback(null, result)
      }
    )
    return tx
  }

  tx.filter = function(f) {
    var result = []
    collect(arguments,
      function(item, value) {
        if (value) {
          result.push(item)
        }
      },
      function(callback) {
        callback(null, result)
      }
    )
    return tx
  }

  tx.detect = function(f) {
    var detected
    collect(arguments,
      function(item, value) {
        if (value) {
          detected = item
          return true
        }
      },
      function(callback) {
        callback(null, detected)
      }
    )
    return tx
  }

  tx.concat = function(f) {
    var result = []
    collect(arguments,
      function(item, value) {
        result = result.concat(value)
      },
      function(callback) {
        callback(null, result)
      }
    )
    return tx
  }

  tx.then = function(f) {
    chain.push(f)
    return tx
  }

  tx.clean = function() {
    chain.push(function(callback) {
      callback()
    })
    return tx
  }

  tx.debug = function(message, trace) {
    message = message || 'Debug'
    var f = function() {
      var args = Array.prototype.slice.call(arguments)
      var callback = args.pop()
      var obj = {}
      Error.captureStackTrace(obj)
      if (trace) {
        console.trace(message)
      } else {
        console.log(message)
      }
      args.forEach(function(arg) {
        console.dir(arg)
      })
      callback.apply(this, [null].concat(args))
    }
    f.debug = true
    chain.push(f)
    return tx
  }

  tx.end = function(f) {
    if (!f) {
      var promise = new Promise(function(resolve, reject) {
        f = function(err, result) {
          if (err) return reject(err)
          resolve(result)
        }
      })
    }
    end = f
    if (initial) {
      callNext.apply(null, initial)
    } else {
      callNext()
    }
    return promise
  }

  tx.set = function(key, value) {
    values[key] = value
  }

  tx.get = function(key) {
    return values[key]
  }

  if (typeof f === 'function') {
    if (arguments.length === 1) {
      tx.then(f)
    } else {
      var args = Array.prototype.slice.call(arguments)
      args.shift() // removes f
      tx.then(function(callback) {
        args.push(callback)
        f.apply(null, args)
      })
    }
  } else {
    initial = [null].concat(Array.prototype.slice.call(arguments))
  }
  return tx
}
