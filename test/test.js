var txain = require('../')
var assert = require('assert')

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

})