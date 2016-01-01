txain
=====

A simple module for asynchronous control flow.

* Use callback-based async functions in a promise-like way
* Combine callback-based and promise-based functions in a natural way
* Iterate and manipulate arrays asynchronously with: `each`, `map`, `filter`, `reject`, `detect` and `concat`
* Debug the result and execution of async functions easily with `.debug()`

txain let's you organize your code like this:

```javascript
  txain(function(callback) {
    someAsyncFunction('hello world', callback)
  })
  .then(function(a, b, c, callback) {
    // `a`, `b` and `c` are parameters returned by `someAsyncFunction`
    anotherAsyncFunction(a, b, callback)
  })
  .then(function(value, callback) {
    // you can ignore the `callback` and return a promise
    return promiseBasedFunction(value)
  })
  // if a function returns an array you can manipulate it
  .map(function(file, callback) {
    fs.readFile(file, callback)
  })
  .end(function(err, fileContents) {
    if (err) return console.log('err', err)
    // `fileContents` is an array with the content of all the files
    // returned by `promiseBasedFunction`
    console.dir(fileContents)
  })
```

## How it works

* When an error is passed to a `callback` or a promise fails then the `end()` function is called with that error and no more `then()` functions are called.
* When all the `then()` functions are called then `end()` is called with a `null` error and the rest of arguments passed by the latest `then()` function.
* txain automatically adjusts the number of arguments passed to the next function.
* If you don't pass a function to the `end()` method it returns a promise.

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

Combining this way of creating a `taxin` and the ability to return a promise on `.end()` if you don't pass any arguments you can create promises easily based on callback-based async functions like this.

```javascript
var promise = txain(fs.readFile, __filename, 'utf8').end()
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
