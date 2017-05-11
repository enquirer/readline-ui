'use strict';

var debug = require('debug')('readline-ui');
var Emitter = require('component-emitter');
var stringWidth = require('string-width');
var stripColor = require('strip-color');
var utils = require('readline-utils');
var cached;

/**
 * Create a readline interface to use in prompts
 */

function UI(options) {
  if (!(this instanceof UI)) {
    var ui = Object.create(UI.prototype);
    UI.apply(ui, arguments);
    return ui;
  }
  debug('initializing from <%s>', __filename);
  this.options = utils.createOptions(options);
  this.output = this.options.output;
  this.input = this.options.input;
  this.appendedLines = 0;
  this.height = 0;
  this.initInterface();
}

/**
 * Decorate emitter methods
 */

Emitter(UI.prototype);

/**
 * Initialize settings and events.
 */

UI.prototype.initInterface = function() {
  if (this.initialized) return;
  this.initialized = true;
  if (typeof this.rl === 'undefined') {
    this.rl = utils.createInterface(this.options);
  }

  this.force = this.forceClose.bind(this);
  this.input.on('keypress', this.onKeypress.bind(this));
  this.rl.resume();
  this.rl.on('line', this.emit.bind(this, 'line'));
  this.rl.on('SIGINT', this.force);
  process.on('exit', this.force);
};

/**
 * Handle `keypress` events.
 *
 * @param {String} `str`
 * @param {Object} `key`
 * @return {undefined}
 * @api public
 */

UI.prototype.onKeypress = function(str, key) {
  utils.emitKeypress(this, str, key);
};

/**
 * Render the given `str` in the terminal, and optional `bottomContent`.
 * @param {String} `str`
 * @param {String} `bottomContent`
 * @return {undefined}
 * @api public
 */

UI.prototype.render = function(str, bottomContent) {
  this.rl.output.unmute();
  this.clearLines(this.appendedLines);

  // Write message to screen and setPrompt to control backspace
  var promptLine = utils.lastLine(str);
  var rawPromptLine = this.unstyle(promptLine);

  // Remove the last line from our prompt. We can't rely
  // on the str of rl.line (mainly because of the password
  // prompt), so just rely on it's length.
  var prompt = promptLine;
  if (this.rl.line.length) {
    prompt = prompt.slice(0, -this.rl.line.length);
  }

  this.rl.setPrompt(prompt);

  // setPrompt will change cursor position, now we can get correct value
  var cursorPos = this.rl._getCursorPos();
  var width = utils.cliWidth(this.rl);

  str = utils.forceLineReturn(str, width);
  if (bottomContent) {
    bottomContent = utils.forceLineReturn(bottomContent, width);
  }

  // Manually insert an extra line if we're at the end of
  // the line. This prevents the cursor from appearing at
  // the beginning of the current line.
  if (rawPromptLine.length % width === 0) {
    str += '\n';
  }

  var fullContent = str + (bottomContent ? '\n' + bottomContent : '');
  this.rl.output.write(fullContent);

  // We need to consider parts of the prompt under the
  // cursor as part of the bottom string in order to
  // correctly cleanup and re-render.
  var promptLineUpDiff = Math.floor(rawPromptLine.length / width) - cursorPos.rows;
  var bottomContentHeight = promptLineUpDiff + (bottomContent ? utils.height(bottomContent) : 0);
  if (bottomContentHeight > 0) {
    utils.up(this.rl, bottomContentHeight);
  }

  // Reset cursor at the beginning of the line
  var lastLine = utils.lastLine(fullContent);
  utils.left(this.rl, stringWidth(lastLine));

  // Adjust cursor on the right
  var newPos = this.unstyle(lastLine).length;
  utils.right(this.rl, newPos);

  // Set up state for next re-rendering
  this.appendedLines = bottomContentHeight;
  this.height = utils.height(fullContent);
  this.rl.output.mute();
};

/**
 * Remove `n` lines from the bottom of the terminal
 * @param {Number} `lines` Number of lines to remove
 * @api public
 */

UI.prototype.clearLines = function(n) {
  if (n) utils.down(this.rl, n);
  utils.clearLine(this.rl, this.height);
};

/**
 * Cache the current cursor's column and line position.
 * @returns {Object} UI instance.
 */

UI.prototype.cacheCursorPos = function() {
  this.cursorPos = utils.cursorPosition(this.rl);
  return this;
};

/**
 * Restore the cursor position to the cached column and line.
 * @return {Object} UI instance.
 */

UI.prototype.restoreCursorPos = function() {
  utils.restoreCursorPos(this.rl, this.cursorPos);
  return this;
};

/**
 * Pause the input stream, allowing it to be resumed later if necessary.
 */

UI.prototype.pause = function() {
  this.rl.pause();
  this.emit('pause');
};

/**
 * Close the `readline.Interface` instance and relinquish
 * control over the input and output streams. Also removes
 * event listeners, and restores/unmutes prompt functionality.
 */

UI.prototype.close = function() {
  utils.close(this.rl);
  this.emit('close');
};

/**
 * Close the interface when the keypress is `^C`
 */

UI.prototype.forceClose = function() {
  utils.forceClose(this.rl);
};

/**
 * Returns an "indentity" function that calls `.close()`,
 * which can be used as the final `.then()` function with
 * promises.
 */

UI.prototype.finish = function() {
  return function(val) {
    this.close();
    this.emit('finish');
    return val;
  }.bind(this);
};

/**
 * Default method for writing a prompt to the terminal.
 * This can be overridden.
 */

UI.prototype.end = function(newline) {
  this.rl.setPrompt('');
  this.rl.output.unmute();
  this.rl.output.write(newline !== false ? '\n' : '');
  utils.cursorShow(this.rl);
};

/**
 * Convenience method for debugging
 */

UI.prototype.log = function() {
  this.rl.output.unmute();
  console.log.apply(console, arguments);
  this.rl.output.mute();
};

/**
 * Convenience method for debugging
 */

UI.prototype.unstyle = function(str) {
  return stripColor(str);
};

/**
 * Expose `UI`
 */

module.exports = UI;

/**
 * Expose `UI.create` for using a single instance across
 * multiple prompts.
 */

module.exports.create = function(options) {
  if (cached) return cached;
  cached = new UI(options);
  return cached;
};
