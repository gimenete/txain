txain
=====

A simple module for async control flow

txain is inspired on `async.waterfall` but with a slightly different syntax and a couple of additional benefits.

txain let's you organize your code like this:

```javascript
  chain(function(callback) {
    callback(null, 'hello', 'world')
  })
  .then(function(a, b, c, callback) {
    callback(null, { foo: a })
  })
  .end(function(err, obj) {
    if (err) return console.log('err', err)
    console.dir(obj)
  })
```

## How it works

* When an error is passed to a `callback` then the `end()` function is called with that error and no more `then()` functions are called.
* When all the `then()` functions are called then `end()` is called with a `null` error and the rest of arguments passed by the latest `then()` function.
* txain automatically adjusts the number of arguments passed to the next function. This is the main difference with `async.waterfall`

The following code fails in `async.waterfall` with `TypeError: string is not a function`

```javascript
var async = require('async')

async.waterfall([

  function foo(callback) {
    callback(null, 'a', 'b')
  },

  function bar(a, callback) {
    callback()
  }

], function(err) {
  console.log('foo')
})
```

But this works with txain:

```javascript
txain(function(callback) {
  callback(null, 'a', 'b')
}).then(function(a, callback) {
  callback()
}).end(function(err) {
  console.log('foo')
})
```

This is very useful since adding more arguments to your callbacks doesn't break your code.

```javascript
function foobar(callback) {
  return callback(null, 'a', 'b', 'c') // don't be afraid to add more arguments
}

txain(function(callback) {
  foobar(callback)
}).then(function(a, b, callback) {
  return callback()
}).end(function(err) {
  console.log('Done')
})
```

## Full example

```javascript
var txain = require('txain')
var fs = require('fs')
var dns = require('dns')
var path = require('path')

txain(function(callback) {
  dns.lookup('google.com', callback)
}).then(function(address, family, callback) {
  fs.writeFile(path.join(__dirname, 'address.txt'), address, callback)
}).then(function(callback) {
  // more async functions
}).end(function(err) {
  if (err) return console.log('Error: '+err)
  console.log('Done :)')
})
```

As you can see you can have many `then()` functions but you can handle all errors in the same place, and additionally your code doesn't start nesting.
