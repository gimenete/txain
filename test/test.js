var txain = require('../')
var assert = require('assert')
var _ = require('underscore')
var fs = require('fs')
var path = require('path')

describe('Test the whole thing', function() {

  it('jumps to end() when an error occurs', function(done) {
    txain(function(callback) {
      callback(new Error('some error'))
    }).then(function(a, b, callback) {
      assert.fail('This function should not be called')
    }).end(function(err, a) {
      assert.ok(err)
      done()
    })
  })

  it('works with less or more arguments', function(done) {
    txain(function(callback) {
      callback(null, 'a', 'b', 'c')
    }).then(function(a, b, callback) {
      assert.equal(a, 'a')
      assert.equal(b, 'b')
      callback(null, a)
    }).then(function(a, b, callback) {
      assert.equal(a, 'a')
      assert.equal(b, undefined)
      callback(null)
    }).end(function(err, a) {
      assert.equal(a, undefined)
      done()
    })
  })

  it('sets and gets values from the chain', function(done) {
    txain(function(callback) {
      this.set('foo', 100)
      callback()
    }).then(function(callback) {
      callback()
    }).then(function(callback) {
      assert.equal(this.get('foo'), 100)
      callback()
    }).end(function(err, a) {
      assert.ifError(err)
      assert.equal(this.get('foo'), 100)
      done()
    })
  })

  it('implements the each function', function(done) {
    var iterations = 0
    txain(function(callback) {
      callback(null, ['aa', 'ab', 'bc'])
    }).each(function(item, callback) {
      iterations++
      callback()
    }).then(function(items, foo, callback) {
      assert.equal(items, undefined)
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      assert.equal(iterations, 3)
      done()
    })
  })

  it('implements the map function', function(done) {
    txain(function(callback) {
      callback(null, ['a', 'b', 'c'])
    }).map(function(item, callback) {
      callback(null, '#'+item)
    }).then(function(items, foo, callback) {
      assert.ok(_.isEqual(items, ['#a', '#b', '#c']))
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('implements the filter function', function(done) {
    txain(function(callback) {
      callback(null, ['aa', 'ab', 'bc'])
    }).filter(function(item, callback) {
      callback(null, item.substring(0, 1) === 'a')
    }).then(function(items, foo, callback) {
      assert.ok(_.isEqual(items, ['aa', 'ab']))
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('implements the reject function', function(done) {
    txain(function(callback) {
      callback(null, ['aa', 'ab', 'bc'])
    }).reject(function(item, callback) {
      callback(null, item.substring(0, 1) !== 'a')
    }).then(function(items, foo, callback) {
      assert.ok(_.isEqual(items, ['aa', 'ab']))
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('implements the concat function', function(done) {
    txain(function(callback) {
      callback(null, ['a', 'b', 'c'])
    }).concat(function(item, callback) {
      callback(null, [item, '#'+item])
    }).then(function(items, foo, callback) {
      assert.ok(_.isEqual(items, ['a', '#a', 'b', '#b', 'c', '#c']))
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('implements the detect function', function(done) {
    var iterations = 0
    txain(function(callback) {
      callback(null, ['aa', 'ab', 'bc'])
    }).detect(function(item, callback) {
      iterations++
      callback(null, item === 'ab')
    }).then(function(detected, foo, callback) {
      assert.equal(detected, 'ab')
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ifError(err)
      assert.equal(iterations, 2)
      done()
    })
  })

  it('runs the end() function when an error happens iterating', function(done) {
    var iterations = 0
    txain(function(callback) {
      callback(null, ['aa', 'ab', 'bc'])
    }).detect(function(item, callback) {
      iterations++
      if (item === 'ab') return callback(new Error('foo'))
      callback(null, item === 'ab')
    }).then(function(detected, foo, callback) {
      assert.equal(detected, 'ab')
      assert.equal(foo, undefined)
      callback()
    }).end(function(err) {
      assert.ok(err)
      assert.equal(iterations, 2)
      done()
    })
  })

  it('lets create a txain with an array', function(done) {
    var iterations = 0
    txain(['aa', 'ab', 'bc'])
      .each(function(item, callback) {
        iterations++
        callback()
      }).then(function(foo, callback) {
        assert.equal(foo, undefined)
        callback()
      }).end(function(err) {
        assert.ifError(err)
        assert.equal(iterations, 3)
        done()
      })
  })

  it('lets create a txain with any number of arguments', function(done) {
    txain('a', 'b', 'c')
      .then(function(a, b, c, callback) {
        assert.equal(a, 'a')
        assert.equal(b, 'b')
        assert.equal(c, 'c')
        callback()
      }).then(function(foo, callback) {
        assert.equal(foo, undefined)
        callback()
      }).end(function(err) {
        assert.ifError(err)
        done()
      })
  })

  it('lets create a txain with a function and arguments', function(done) {
    var f = function(a, b, callback) {
      callback(null, a, b)
    }

    txain(f, 'a', 'b')
      .then(function(a, b, c, callback) {
        assert.equal(a, 'a')
        assert.equal(b, 'b')
        callback()
      }).end(function(err) {
        assert.ifError(err)
        done()
      })
  })

  it('tests the clean() function', function(done) {
    txain(function(callback) {
      callback(null, 'a', 'b', 'c')
    })
    .clean()
    .then(function(a, b, c, callback) {
      assert.equal(a, undefined)
      assert.equal(b, undefined)
      assert.equal(c, undefined)
      callback(null)
    }).end(function(err, a) {
      assert.equal(a, undefined)
      done()
    })
  })

  it('tests the debug() function', function(done) {
    txain(function(callback) {
      callback(null, 'a', 'b', 'c')
    })
    .debug('This is a debug message')
    .debug()
    .end(function(err, a, b, c) {
      assert.equal(a, 'a')
      assert.equal(b, 'b')
      assert.equal(c, 'c')
      done()
    })
  })

  it('tests the debug() function with trace=true', function(done) {
    txain(function(callback) {
      callback(null, 'a', 'b', 'c')
    })
    .debug('This is a debug message', true)
    .debug()
    .end(function(err, a, b, c) {
      assert.equal(a, 'a')
      assert.equal(b, 'b')
      assert.equal(c, 'c')
      done()
    })
  })

  it('tests passing additional arguments to collection functions', function(done) {
    txain([__filename, path.join(__dirname, '..', 'index.js')])
    .map(fs.readFile, 'utf8')
    .end(function(err, arr) {
      assert.ifError(err)
      assert.ok(!Buffer.isBuffer(arr[0]))
      assert.ok(!Buffer.isBuffer(arr[1]))
      done()
    })
  })

  it('tests that txain does not modify the original array', function(done) {
    var iterations = 0
    var arr = ['aa', 'ab', 'bc']
    txain(arr)
      .each(function(item, callback) {
        iterations++
        callback()
      }).then(function(callback) {
        callback()
      }).end(function(err) {
        assert.ifError(err)
        assert.equal(iterations, 3)
        assert.equal(arr.length, 3)
        done()
      })
  })

  it('tests basic usage with promises', function(done) {
    txain(function(callback) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve('hello world')
        }, 1)
      })
    })
    .then(function(msg, callback) {
      assert.equal(msg, 'hello world')
      callback()
    })
    .end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('tests errors with promises', function(done) {
    txain(function(callback) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(new Error('some error'))
        }, 1)
      })
    })
    .then(function(msg, callback) {
      assert.fail('This function should not be called')
    })
    .end(function(err) {
      assert.ok(err)
      done()
    })
  })

  it('tests collections with promises', function(done) {
    var n = 0
    var arr = ['1', '2', '3']
    txain(function(callback) {
      return callback(null, arr)
    })
    .map(function(elem, callback) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(elem)
        }, 1)
      })
    })
    .then(function(elements, callback) {
      assert.equal(arr.length, elements.length)
      for (var i=0; i<arr.length; i++) {
        assert.equal(elements[0], arr[0])
      }
      callback()
    })
    .end(function(err) {
      assert.ifError(err)
      done()
    })
  })

  it('tests collections with promises handling errors', function(done) {
    var n = 0
    var arr = ['1', '2', '3']
    var elements = []
    txain(function(callback) {
      return callback(null, arr)
    })
    .map(function(elem, callback) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          if (elem === '2') {
            return reject(new Error('some error'))
          }
          elements.push(elem)
          resolve(elem)
        }, 1)
      })
    })
    .then(function(elements, callback) {
      assert.fail('This function should not be called')
    })
    .end(function(err) {
      assert.ok(err)
      assert.equal(elements.length, 1)
      assert.equal(elements[0], '1')
      done()
    })
  })

  it('tests thosands of elements in a collection', function(done) {
    var iterations = 0
    var arr = []
    for (var i=0; i<10000; i++) arr.push('-')
    txain(function(callback) {
      callback(null, arr)
    }).each(function(item, callback) {
      iterations++
      callback()
    }).end(function(err) {
      assert.ifError(err)
      assert.equal(iterations, i)
      done()
    })
  })

  it('tests returning a promise on .end()', function(done) {
    var promise =
      txain(function(callback) {
        setTimeout(function() {
          callback(null, 'hello world')
        }, 1)
      }).end()

    promise.then(function(msg) {
      assert.equal(msg, 'hello world')
      done()
    })
    .catch(function(err) {
      assert.fail('This function should not be called')
    })
  })

  it('tests returning a promise on .end() and failing', function(done) {
    var promise =
      txain(function(callback) {
        setTimeout(function() {
          callback(new Error('some error'))
        }, 1)
      }).end()

    promise.then(function(msg) {
      assert.fail('This function should not be called')
    })
    .catch(function(err) {
      assert.ok(err)
      done()
    })
  })

  it('tests combining promises with initial function passed to txain()', function(done) {
    txain(fs.readFile, __filename, 'utf8').end()
      .then(function(content) {
        assert.ok(content)
        done()
      })
      .catch(function(err) {
        assert.fail('This function should not be called')
      })
  })

  it('tests combining promises with initial function passed to txain() and fails', function(done) {
    txain(fs.readFile, __filename, 'utf8').end()
      .then(function(content) {
        assert.fail('This function should not be called')
      })
      .catch(function(err) {
        assert.ok(err)
        done()
      })
  })

})
