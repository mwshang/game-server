///**
// * Created by fyw2515 on 2017/12/3.
// */
//var pomelo = require('pomelo');
//var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType()+'-log', __filename);
//var util = require('util');
//var EventEmitter = require('events').EventEmitter;
//
//var BasePlayer = function(opts)
//{
//  EventEmitter.call(this, opts);
//};
//
//util.inherits(BasePlayer, EventEmitter);
//var pro = BasePlayer.prototype;
////获取摸牌
//pro.qiPai = function(end)
//{
//  var pai={};
//  logger.debug("玩家起牌 gmqipai %j",this.gmQiPai);
//  if (!!this.gmQiPai && this.gmQiPai != null){
//    pai = this.table.Card.qiPai_debug(this.gmQiPai);
//    if (pai == null)
//      pai = this.table.Card.qiPai(end);
//    this.gmQiPai = null;
//    this.gmQiPaiNum += 1;
//  }else if(!!this.table.gmRoundBuPai && this.table.gmRoundBuPai.length > 0){
//    logger.debug("gm补牌 gmbupai %j",this.table.gmRoundBuPai);
//    pai = this.table.Card.qiPai_debug(this.table.gmRoundBuPai.shift());
//    if (pai == null)
//      pai = this.table.Card.qiPai(end);
//  }
//  else {
//    pai = this.table.Card.qiPai(end);
//  }
//
//  return pai;
//}