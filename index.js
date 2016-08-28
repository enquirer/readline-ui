'use strict';

var readline = require('readline');
var MuteStream = require('mute-stream');
var Emitter = require('component-emitter');
var extend = require('extend-shallow');
var utils = require('readline-utils');

/**
 * Create a readline interface to use in prompts
 */

function UI(options) {
  var defaults = {terminal: true, input: process.stdin, output: process.stdout};
  var opts = extend(defaults, options);
  this.output = opts.output;
  this.input = opts.input;

  if (typeof this.rl === 'undefined') {
    this.rl = this.createInterface(opts);
  }

  this.rl.resume();
  this.force = this.forceClose.bind(this);

  // Make sure that a new prompt begins on a newline when closing
  this.rl.on('SIGINT', this.force);
  process.on('exit', this.force);
}

/**
 * Decorate emitter methods
 */

Emitter(UI.prototype);

/**
 * Close the interface when the keypress is `^C`
 */

UI.prototype.forceClose = function() {
  this.close();
  this.output.write('\n');
};

/**
 * Close the interface, remove event listeners, and restore/unmute
 * prompt functionality
 */

UI.prototype.close = function() {
  process.removeListener('exit', this.force);
  this.rl.removeListener('SIGINT', this.force);
  this.rl.output.unmute();
  this.rl.output.end();
  this.rl.pause();
  this.rl.close();
};

/**
 * Returns an "indentity" function that calls `.close()`, which can
 * be used as the final `.then()` function with promises.
 */

UI.prototype.finish = function() {
  return function(val) {
    this.emit('finished');
    this.close();
    return val;
  }.bind(this);
};

/**
 * If an interface isn't already defined, call `readline.createInterface()`
 * with the given options.
 *
 * @param {Object} `options`
 * @return {Object}
 */

UI.prototype.createInterface = function(options) {
  var ms = new MuteStream();
  ms.pipe(options.output);
  options.output = ms;
  return readline.createInterface(options);
};

/**
 * Expose `UI`
 */

module.exports = UI;
