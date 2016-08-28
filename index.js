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
  var opts = utils.createOptions(options);
  this.output = opts.output;
  this.input = opts.input;

  if (typeof this.rl === 'undefined') {
    this.rl = utils.createInterface(opts);
  }

  this.force = this.forceClose.bind(this);
  this.rl.resume();
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
  this.output.write('\r');
  utils.forceClose(this.rl);
};

/**
 * Close the interface, remove event listeners, and restore/unmute
 * prompt functionality
 */

UI.prototype.close = function() {
  utils.close(this.rl);
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
 * Expose `UI`
 */

module.exports = UI;
