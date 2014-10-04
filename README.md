txain
=====

A simple module for asynchronous control flow

txain is inspired on `async.waterfall` but with a slightly different syntax and a couple of additional benefits.

txain let's you organize your code like this:

```javascript
  txain(function(callback) {
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
})
.then(function(a, callback) {
  callback()
})
.end(function(err) {
  console.log('foo')
})
```

This is very useful since adding more arguments to your callbacks doesn't break your code.

```javascript
function foobar(callback) {
  return callback(null, 'a', 'b', 'c') // don't be afraid to add more arguments
}

txain(foobar)
  .then(function(a, b, callback) {
    return callback()
  })
  .end(function(err) {
    console.log('Done')
  })
```

## A near-real-world example

```javascript
var txain = require('txain')
var fs = require('fs')
var dns = require('dns')
var path = require('path')

txain(function(callback) {
  dns.lookup('google.com', callback)
})
.then(function(address, family, callback) {
  fs.writeFile(path.join(__dirname, 'address.txt'), address, callback)
})
.then(function(callback) {
  // more async functions
})
.end(function(err) {
  if (err) return console.log('Error: '+err)
  console.log('Done :)')
})
```

As you can see you can have many `then()` functions but you can handle all errors in the same place, and additionally your code doesn't start nesting.

## The get/set functions

Sometimes you want to call a function directly in the chain but then you can lose parameters from previous functions. No problem, you can solve this with the `set` and `get` functions. For instance in the previous example we are missing the `family` variable in the following functions. This is how you can solve this:

```javascript
var txain = require('txain')
var fs = require('fs')
var dns = require('dns')
var path = require('path')

txain(function(callback) {
  dns.lookup('google.com', callback)
})
.then(function(address, family, callback) {
  this.set('family', family)
  fs.writeFile(path.join(__dirname, 'address.txt'), address, callback)
})
.then(function(callback) {
  var family = this.get('family')
  console.log('family', 'IPv'+family)
  callback()
})
.end(function(err) {
  if (err) return console.log('Error: '+err)
  console.log('Done :)')
})
```

## Iterating over collections

Like the well-known `async` module, `txain` also supports iterating over collections. You can use the `each`, `map`, `reject`, `filter`, `detect` and `concat` functions. All these functions expect that the previous function returns an array as first parameter. Then the array is iterated and the callback function passed to these functions is called for each item in the array.

The following is a real world example using `reject` and `map`. The following code gets a list of files in the current directory, then removes those files that are directories and then reads the content of all

```javascript
var fs = require('fs')

function isDirectory(file, callback) {
  fs.stat(file, function(err, stat) {
    if (err) return callback(err)
    callback(null, stat.isDirectory())
  })
}

txain(function(callback) {
  fs.readdir(__dirname, callback)
})
.reject(isDirectory)
.map(fs.readFile)
.end(function(err, files) {
  if (err) return console.log('Error: '+err)
  console.log('Done', files)
})
```

Available functions:

* `each`. Iterates all the items one by one. The next function won't receive additional arguments.
* `map`. Iterates all the items one after the other and collects the first non-err argument in an array that is passed to the next function.
* `filter`. Iterates all the items one after the other and collects those items that return a truly value in the callback function.
* `reject`. Iterates all the items one after the other and collects those items that return a falsy value in the callback function.
* `detect`. Iterates all the items one after the other stopping when an item returns a truly value in the callback function. That item is passed to the next function.
* `concat`. The callback function is expected to return an array. This function then iterates all the items one after the other concatenating all the returned arrays and passing the result to the next function.

These functions also allow you to pass additional fixed arguments like for example:

```javascript
txain(function(callback) {
  fs.readdir(__dirname, callback)
})
.reject(isDirectory)
.map(fs.readFile, 'utf8') // read as UTF-8
.end(function(err, files) {
  if (err) return console.log('Error: '+err)
  console.log('Done', files)
})
```

Those functions that require a boolean argument such as `filter` or `reject`, unlike the similar functions in the `async` module, require to pass two arguments to the callback function: `err` (if any) and the boolean value. So in `txain` you cannot use `fs.exists` directly like this `.map(fs.exists)`.

## Other ways of creating a `txain`

In all the examples you can see that you crate a `txain` with an initial function.

You can also create a `txain` passing a function with arguments like this:

```javascript
txain(fs.readdir, __dirname)
.filter(isDirectory)
.end(function(err, directories) {
  if (err) return console.log('Error: '+err)
  console.log('Done', directories)
})
```

And you can also create a `txain` with any inital arguments like this:

```javascript
txain(['foo.txt', 'bar.txt'])
.map(fs.readFile)
.end(function(err, files) {
  if (err) return console.log('Error: '+err)
  console.log('Done', files)
})
```

## Utility functions

You can stop propagating arguments with the `clean()` function like this:

```javascript
txain(['foo.txt', 'bar.txt'])
.map(fs.readFile)
.clean()
.end(function(err, files) {
  // here files is always undefined
})
```

You can print easily the arguments passed from one function to the next one adding a `debug([message, [trace]])` call like this:

```javascript
txain(['foo.txt', 'bar.txt'])
.map(fs.readFile)
.debug('An optional message', true)
.end(function(err, files) {
  // here files is always undefined
})
```

If `trace` is `true` then the message will be printed using `console.trace()` and with `console.log()` otherwise. The arguments are printed using `console.dir()`
