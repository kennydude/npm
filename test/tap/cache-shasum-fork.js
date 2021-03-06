var npm = require.resolve("../../")
var test = require("tap").test
var path = require("path")
var fs = require("fs")
var rimraf = require("rimraf")
var mkdirp = require("mkdirp")
var mr = require("npm-registry-mock")
var common = require("../common-tap.js")
var cache = path.resolve(__dirname, "cache-shasum-fork", "CACHE")
var cwd = path.resolve(__dirname, "cache-shasum-fork", "CWD")
var spawn = require("child_process").spawn
var server

// Test for https://github.com/npm/npm/issues/3265

test("mock reg", function(t) {
  rimraf.sync(cache)
  mkdirp.sync(cache)
  rimraf.sync(cwd)
  mkdirp.sync(path.join(cwd, "node_modules"))
  mr(common.port, function (s) {
    server = s
    t.pass("ok")
    t.end()
  })
})

test("npm cache - install from fork", function(t) {
  // Install from a tarball that thinks it is underscore@1.5.1
  // (but is actually a fork)
  var forkPath = path.resolve(
    __dirname, "cache-shasum-fork", "underscore-1.5.1.tgz")
  var output = ""
    , child = spawn(process.execPath, [npm, "install", forkPath], {
      cwd: cwd,
      env: {
        "npm_config_cache"    : cache,
        "npm_config_registry" : common.registry,
        "npm_config_loglevel" : "silent"
      }
    })

  child.stderr.on("data", function(d) {
    t.fail("Should not get data on stderr: " + d)
  })

  child.stdout.on("data", function(d) {
    output += d.toString()
  })

  child.on("close", function(code) {
    t.equal(code, 0, "exit ok")
    t.equal(output, "underscore@1.5.1 node_modules/underscore\n")
    var index = fs.readFileSync(
      path.join(cwd, "node_modules", "underscore", "index.js"),
      "utf8"
    )
    t.equal(index, 'console.log("This is the fork");\n\n')
    t.end()
  })
})

test("npm cache - install from origin", function(t) {
  // Now install the real 1.5.1.
  rimraf.sync(path.join(cwd, "node_modules"))
  mkdirp.sync(path.join(cwd, "node_modules"))
  var output = ""
    , child = spawn(process.execPath, [npm, "install", "underscore"], {
      cwd: cwd,
      env: {
        "npm_config_cache"    : cache,
        "npm_config_registry" : common.registry,
        "npm_config_loglevel" : "silent"
      }
    })

  child.stderr.on("data", function(d) {
    t.fail("Should not get data on stderr: " + d)
  })

  child.stdout.on("data", function(d) {
    output += d.toString()
  })

  child.on("close", function(code) {
    t.equal(code, 0, "exit ok")
    t.equal(output, "underscore@1.5.1 node_modules/underscore\n")
    var index = fs.readFileSync(
      path.join(cwd, "node_modules", "underscore", "index.js"),
      "utf8"
    )
    t.equal(index, "module.exports = require('./underscore');\n")
    t.end()
  })
})

test("cleanup", function(t) {
  server.close()
  rimraf.sync(cache)
  rimraf.sync(cwd)
  t.end()
})
