
var cyan = require('ansi-cyan');
var UI = require('./');
var ui = new UI();

var prompt = '? Favorite color? ';
ui.render(prompt);

ui.on('keypress', function() {
  ui.render(prompt + ui.rl.line);
});

ui.on('line', function(answer) {
  ui.render(prompt + cyan(answer));
  ui.end();
  ui.rl.pause();
  console.log({color: answer});
});
