var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');

var Timer = function(opts)
{
  this.delegate = opts.delegate;
  this.interval = opts.interval||1000;
};

Timer.prototype.__defineSetter__('Interval', function(y) {this.interval = y});

module.exports = Timer;

Timer.prototype.run = function () {
  this.interval = setInterval(this.tick.bind(this), this.interval);
};

Timer.prototype.close = function () {
  clearInterval(this.interval);
};

Timer.prototype.tick = function()
{
  var delegate = this.delegate;
  delegate.update();
};