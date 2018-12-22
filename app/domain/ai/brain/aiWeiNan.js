/**
 * Created by fyw2515 on 2017/12/3.
 */
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var aiMjBase = require('./aiMjBase');
var Event = require('../../../consts/consts').MajhongEvent;
var util=require('util');
var Brain = function(player) {

  aiMjBase.call(this, player);

  this.bindEvents();

  this.start();
};

util.inherits(Brain, aiMjBase);
module.exports = Brain;

var pro = Brain.prototype;

pro.bindEvents = function() {
  aiMjBase.prototype.bindEvents.call(this);
  this.Events.push(Event.mjDingQueStart);
};

pro.start = function() {
  aiMjBase.prototype.start.call(this);

  this.on('mjDingQueStart', function(msg){
    logger.debug("AI收到换缺通知:%j", msg);
    var delcard = {};
    delcard["uid"] = this.Robot.uid;
    var pai = this.Table.PlayerUids[this.Robot.uid].analyseDingQue();
    delcard["que"] = pai;
    logger.debug("AI 定缺:%j", delcard);
    setTimeout(function(){
      this.Table.dingQue(delcard);
    }.bind(this), this.getRandomNum(2, 4) * 1000);

  });
}

module.exports.clone = function(opts) {
  return new Brain(opts.player);
};

module.exports.name = 'aiWeiNan';