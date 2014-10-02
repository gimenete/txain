module.exports = function(f) {
  var pro = {}
  var chain = []
  var end = null
  var values = {}
  var initial = null
 
  function callNext() {
    var f = chain.shift()
    if (!f) {
      end.apply(pro, arguments)
    } else {
      var args = Array.prototype.slice.call(arguments)
      var err = args.shift()
      if (err) {
        end.call(pro, err)
      } else {
        // remove arguments if needed
        if (args.length >= f.length) {
          args = args.splice(0, f.length - 1)
        } else {
          // add arguments if needed
          for (var i = args.length; i < f.length - 1; i++) {
            args.push(void 0)
          }
        }
        args.push(callNext)
        f.apply(pro, args)
      }
    }
  }

  function collect(f, collector, finish) {
    chain.push(function(items, callback) {
      var result = []

      function next() {
        if (items.length > 0) {
          var item = items.shift()
          f(item, function(err, value) {
            if (err) return end.call(pro, err)
            var stop = collector(item, value)
            if (stop) {
              finish(callback)
            } else {
              next()
            }
          })
        } else {
          finish(callback)
        }
      }
      next()
    })
  }

  pro.each = function(f) {
    collect(f,
      function(item, value) {},
      function(callback) {
        callback(null)
      }
    )
    return pro
  }

  pro.map = function(f) {
    var result = []
    collect(f,
      function(item, value) {
        result.push(value)
      }, function(callback) {
        callback(null, result)
      }
    )
    return pro
  }

  pro.reject = function(f) {
    var result = []
    collect(f,
      function(item, value) {
        if (!value) {
          result.push(item)
        }
      }, function(callback) {
        callback(null, result)
      }
    )
    return pro
  }

  pro.filter = function(f) {
    var result = []
    collect(f,
      function(item, value) {
        if (value) {
          result.push(item)
        }
      }, function(callback) {
        callback(null, result)
      }
    )
    return pro
  }

  pro.detect = function(f) {
    var detected
    collect(f,
      function(item, value) {
        if (value) {
          detected = item
          return true
        }
      }, function(callback) {
        callback(null, detected)
      }
    )
    return pro
  }

  pro.concat = function(f) {
    var result = []
    collect(f,
      function(item, value) {
        result = result.concat(value)
      }, function(callback) {
        callback(null, result)
      }
    )
    return pro
  }

  pro.then = function(f) {
    chain.push(f)
    return pro
  }
 
  pro.end = function(f) {
    end = f
    if (initial) {
      callNext.apply(null, initial)
    } else {
      callNext()
    }
  }

  pro.set = function(key, value) {
    values[key] = value
  }

  pro.get = function(key) {
    return values[key]
  }
 
  if (typeof f === 'function') {
    pro.then(f)
  } else {
    initial = [null].concat(Array.prototype.slice.call(arguments))
  }
  return pro
}
