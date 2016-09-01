'use strict';

require('mocha');
var assert = require('assert');
var UI = require('..');

describe('readline-ui', function() {
  describe('main export', function() {
    it('should export a function', function() {
      assert.equal(typeof UI, 'function');
    });
  });
});
