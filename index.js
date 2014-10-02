module.exports = function(f) {
  var pro = {}
  var chain = []
  var end = null
 
  function next() {
    var f = chain.shift()
    if (!f) {
      end.apply(null, arguments)
    } else {
      var args = Array.prototype.slice.call(arguments)
      var err = args.shift()
      if (err) {
        end.call(null, err)
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
        args.push(next)
        f.apply(null, args)
      }
    }
  }
 
  pro.then = function(f) {
    chain.push(f)
    return pro
  }
 
  pro.end = function(f) {
    end = f
    next()
  }
 
  return pro.then(f)
}
