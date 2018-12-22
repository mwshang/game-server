
var logger = require('pomelo-logger').getLogger('majhong-log', __filename);

// J 箭牌 中发白  F 风牌 东西南北  W 万  T 条  B 饼  H 花
var PaiFace = {
    "J1" :0, // 中
    "J2" :1, // 发
    "J3" :2, // 白
    "F1" :3, // 东
    "F2" :4, // 西
    "F3" :5, // 南
    "F4" :6, // 北
    "W1" :7, // 1万
    "W2" :8, // 2万
    "W3" :9, // 3万
    "W4" :10, // 4万
    "W5" :11, // 5万
    "W6" :12, // 6万
    "W7" : 13, // 7万
    "W8" : 14, // 8万
    "W9" : 15, // 9万
    "T1" : 16, // 1条
    "T2" : 17, // 2条
    "T3" : 18, // 3条
    "T4" : 19, // 4条
    "T5" : 20, // 5条
    "T6" : 21, // 6条
    "T7" : 22, // 7条
    "T8" : 23, // 8条
    "T9" : 24, // 9条
    "B1" : 25, // 1饼
    "B2" : 26, // 2饼
    "B3" : 27, // 3饼
    "B4" : 28, // 4饼
    "B5" : 29, // 5饼
    "B6" : 30, // 6饼
    "B7" : 31, // 7饼
    "B8" : 32, // 8饼
    "B9" : 33, // 9饼
    "H1" : 34, // 春
    "H2" : 35, // 夏
    "H3" : 36, // 秋
    "H4" : 37, // 冬
    "H5" : 38, // 梅
    "H6" : 39, // 兰
    "H7" : 40, // 竹
    "H8" : 41  // 菊
};

//牌的解析
var Pai = function(faceStr){
    this.type = '';   // 牌类型  J F W B T
    this.value = 0;   // 牌面值

    this.ctor = function() {  // F1 B8 等字符串
        this.type = faceStr[0];
        this.value = parseInt(faceStr[1]);
    };

    this.ctor();
}

var PaiPool = function()
{
    this.Pai = Pai;
    this.pais = [];                     /* 麻将牌 */
    this.paiGot = '';                   /* 起的新牌 */
};

/**
 * 初始化牌
 */
PaiPool.prototype.ctor = function()
{
    this.xiPai();
};
/**
 * 洗牌
 */
PaiPool.prototype.xiPai = function(haveJ, haveF, haveH)
{
    logger.debug("洗牌配置:%s,%s,%s",haveJ, haveF, haveH);
    var pais = [];
    this.pais = [];

    for(var i=1; i<=4; i++) {
        if (haveJ != undefined && haveJ) {
            for(var j=1; j<=3; j++)  // 箭牌： 中发白
                pais.push(new Pai('J'+j));
        }

        if (haveF != undefined && haveF) {
            for(var k=1; k<=4; k++)  // 风牌： 东西南北
                pais.push(new Pai('F'+k));
        }
        // 万
        for(var p=1; p<=9; p++){
            pais.push(new Pai('W'+p));
        }
        // 条
        for(var t=1; t<=9; t++){
            pais.push(new Pai('T'+t));
        }
        // 饼
        for(var c=1; c<=9; c++){
            pais.push(new Pai('B'+c));
        }
    }

    //花牌
    if (haveH != undefined && haveH) {
        for (var i=1; i<=8; i++){
            pais.push(new Pai('H'+i));
        }
    }

    logger.debug("洗牌 :", + pais.length);

    // 打乱顺序放入this.pais
    while (pais.length > 0) {
        var id = Date.now() % pais.length;
        var _pais = pais.splice(id, 1);
        var _id = this.pais.length > 0 ? Date.now() % this.pais.length : 0;
        this.pais.splice(_id, 0, _pais[0]);
    }

    // 再次随机排序
    this.pais.sort(function() { return Math.random()>0.5 ? -1 : 1;});
   logger.debug("洗牌结束 :%j", this.pais, this.pais.length);
};

PaiPool.prototype.leftPaiCount = function(){
    //logger.debug("剩余牌的数量:" + this.pais.length);
    return this.pais.length;
}

/**
 * 发牌（从剩下的牌中取出一个牌发给客户端）
 */
PaiPool.prototype.qiPai = function(end)
{
    if (this.pais.length <= 0){
        return null;
    }
    if (end == undefined || !end)
        this.paiGot = this.pais.shift();
    else
        this.paiGot = this.pais.pop();

    return this.paiGot;
};

/*
给每个玩家初始化手牌
* */
PaiPool.prototype.faPai = function(num,person){
    logger.debug("发牌 :%d,人数:", num,person);

    var pais = {};

    if(!!person)
    {
        for(var idx=0;idx<person;idx++)
        {
            if(idx==0)
                pais[idx] = this.pais.splice(0, num+1); // 庄家的牌
            else
                pais[idx] = this.pais.splice(0, num);
        }

    }
    else
    {
        var pai1 = [];
        var pai2 = [];
        var pai3 = [];
        var pai4 = [];

        pai1 = this.pais.splice(0, num+1); // 庄家的牌
        pai2 = this.pais.splice(0, num);
        pai3 = this.pais.splice(0, num);
        pai4 = this.pais.splice(0, num);

        pais["0"] = pai1;
        pais["1"] = pai2;
        pais["2"] = pai3;
        pais["3"] = pai4;


    }
    logger.debug("发牌11111：%j",pais);
    return pais

}

PaiPool.prototype.genPai = function(str) {
    return new Pai(str);
}


PaiPool.prototype.getPai = function(str){
    for (var j=0; j<this.pais.length; j++) {
        if (this.pais[j].type == str[0] && this.pais[j].value == str[1]) {
            var res = this.pais.splice(j, 1);
            return res[0];
        }
    }
    return null;
}

PaiPool.prototype.faPai_debug = function(){
    var pais = {};
    var pai1 = [];
    var pai2 = [];
    var pai3 = [];
    var pai4 = [];

    //清一色牌
    pai1 = [this.getPai('B1'), this.getPai('F3'), this.getPai('F3'), this.getPai('F3'), this.getPai('F4'), this.getPai('F4'),
        this.getPai('F4'),this.getPai('W2'),this.getPai('W3'),this.getPai('W4'),this.getPai('W7'),this.getPai('W8'),this.getPai('W9'),
        this.getPai('T6'),this.getPai('T6'),this.getPai('B7'),this.getPai('B9')];

    pai4 = [this.getPai('T1'), this.getPai('B1'), this.getPai('H2'), this.getPai('T4'), this.getPai('T5'), this.getPai('T6'), this.getPai('T7'),
        this.getPai('T8'),this.getPai('T7'),this.getPai('T1'),this.getPai('T2'),this.getPai('W1'),this.getPai('W2'),
        this.getPai('W8'),this.getPai('W7'),this.getPai('W6')];

    pai3 = [this.getPai('W1'), this.getPai('W2'), this.getPai('W3'), this.getPai('W4'), this.getPai('W5'), this.getPai('W6'), this.getPai('W7'),
        this.getPai('W8'),this.getPai('W9'),this.getPai('B6'),this.getPai('B7'),this.getPai('T3'),this.getPai('T3'),
        this.getPai('B3'),this.getPai('B4'),this.getPai('T8')];

    pai2 = [this.getPai('W1'), this.getPai('W2'), this.getPai('W3'), this.getPai('W4'), this.getPai('W5'), this.getPai('W6'), this.getPai('W7'),
        this.getPai('W8'),this.getPai('W9'),this.getPai('B6'),this.getPai('B7'),this.getPai('T8'),this.getPai('T8'),
        this.getPai('B3'),this.getPai('B9')];

    pais["0"] = pai1;
    pais["1"] = pai2;
    pais["2"] = pai3;
    pais["3"] = pai4;
    return pais;
}

/**
 * 发具体的牌
 */
PaiPool.prototype.qiPai_debug = function(pai)
{
    logger.debug("qiPai_debug:"+ pai);

    this.paiGot = this.getPai(pai);
    if (!this.paiGot || this.paiGot == null){
        return this.qiPai();
    }
    return this.paiGot;
}

module.exports = PaiPool;

