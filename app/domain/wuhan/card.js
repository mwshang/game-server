
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var majhongPool = require('../../algorithm/majhongPool');
var util = require('util');
var utils = require('../../util/utils');

var Card = function(opts) {
    majhongPool.call(this, opts);
};

util.inherits(Card, majhongPool);

/**
 * 初始化牌
 */
Card.prototype.ctor = function()
{
    this.xiPai(true, true, false);
};

Card.prototype.jinPai = function() {
    var pais = this.pais.slice(0, this.pais.length - 1);
    var len = pais.length;
    //fyw todo  减少难度 先跳过花可做癞子的玩法
    //cxp 减少难度，不会出现风的赖子
    for (var j=len-1; j>=0; j--) {
        if (pais[j].type == 'H' || pais[j].type == 'F' || pais[j].type == 'J') {
            pais.splice(j, 1);
        }
    }
    logger.debug("剩余金牌堆数量:%j",pais);
    var i = utils.random(0, pais.length-1);
    var jin = undefined;

    if(pais[i].value==9
        || (pais[i].type=='F'&& pais[i].value==4)
        ||(pais[i].type=='J'&& pais[i].value==3))
    {
        this.qiPai_debug(''+pais[i].type+pais[i].value);
        jin={'type':pais[i].type,'value':1};
    }
    else
    {
        this.qiPai_debug(''+pais[i].type+pais[i].value);
        jin={'type':pais[i].type,'value':pais[i].value+1};
    }

    //jin = {'type':'T','value':9};
    logger.debug("获取一个金牌:%j, 翻牌 %j", jin,pais[i]);

    return jin;


}

Card.prototype.piZi = function(jin){
    var pizi = [];

    if(jin.value > 2){
        pizi.push({type:jin.type,value:jin.value-1});
        pizi.push({type:jin.type,value:jin.value-2});
    }else if(jin.value ==2){
        pizi.push({type:jin.type,value:jin.value-1});
        pizi.push({type:jin.type,value:9});
    }else{
        pizi.push({type:jin.type,value:9});
        pizi.push({type:jin.type,value:8});
    }

    logger.debug("本局前皮子:%j, 后皮子 %j", pizi[0],pizi[1]);
    return pizi;
}

Card.prototype.faPai_debug = function(){
    var pais = {};
    var pai1 = [];
    var pai2 = [];
    var pai3 = [];
    var pai4 = [];

    //清一色牌
    pai1 = [this.getPai('B1'), this.getPai('B1'), this.getPai('B2'), this.getPai('B2'), this.getPai('B3'),
        this.getPai('B3'), this.getPai('B1'), this.getPai('B2'), this.getPai('B3'), this.getPai('B5'),
        this.getPai('B5'), this.getPai('T3'), this.getPai('T4'),this.getPai('T5')];

    pai3 = [this.getPai('W8'), this.getPai('W8'), this.getPai('B4'), this.getPai('F1'), this.getPai('F3'),
        this.getPai('W8'), this.getPai('W9'), this.getPai('F3'), this.getPai('F3'), this.getPai('F4'),
        this.getPai('F4'),this.getPai('B6'),this.getPai('B7')];

    pai2 = [this.getPai('T3'), this.getPai('T3'), this.getPai('W5'), this.getPai('B2'), this.getPai('B3'),
        this.getPai('T6'), this.getPai('W9'), this.getPai('B4'), this.getPai('B5'), this.getPai('T8'),
        this.getPai('T8'),this.getPai('T9'),this.getPai('T9')];

    pai4 = [this.getPai('B1'), this.getPai('T1'), this.getPai('T1'), this.getPai('T2'), this.getPai('T2'),
        this.getPai('T2'), this.getPai('T6'), this.getPai('T6'), this.getPai('T6'), this.getPai('T4'),
        this.getPai('B5'),this.getPai('B8'),this.getPai('B9')];


    pais["0"] = pai1;
    pais["1"] = pai2;
    pais["2"] = pai3;
    pais["3"] = pai4;
    return pais;
}

module.exports = Card;

/*
方法：
初始化牌
洗牌
发牌
摸牌
玩家打牌
是否可以胡牌 胡牌类型
是否可以吃碰杠
是否可以海底捞月
是否是2/5/8
剩余的牌数
剩余哪些牌 牌山
当前高亮哪个牌 下一个牌

类型：
吃
碰
杠
胡
胡牌类型：
七小对、豪华七小对、双豪华七小对、三豪华七小对
清一色
碰碰胡
全求人（只剩下一个牌）
海底捞月（牌山里面最后一张牌）
将将胡（全是2/5/8）
天胡类型（起手就赚到钱）：
四喜(四个一样的)
缺一色
板板胡（起手没2/5/8）
六六顺（起手两对 三张一样的例如 222 333）
小胡（一对2/5/8做将  其他连上）


* */

