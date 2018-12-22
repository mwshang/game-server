/**
 * Created by DELL on 2017/10/25.
 */
var utils = require('../../util/utils');
var logger = require('pomelo-logger').getLogger('paodekuai-log', __filename);

//牌的解析
var Pai = function (type, value) {
    this.type = '';   // 牌类型  4 3 2 1  黑红梅方
    //                               A  2  3 4 5 6 7 8 9 10 J  Q  K
    this.value = 0;   // 牌面值   0   1  2  3 4 5 6 7 8 9 10 11 12 13
    this.ctor = function () {
        this.type = type;
        this.value = value;
    };
    this.ctor();
}

var Pool = function (opts) {
    this.Pai = Pai;
    this.pais = [];
    /* 牌 */
    this.paiGot = '';
    /* 起的新牌 */
};


Pool.prototype.sortCards = function () {
    utils.shuffle1(this.pais);
    this.pais.sort(function () {
        return Math.random() > 0.5 ? -1 : 1;
    });
};

Pool.prototype.paiCount = function () {
    logger.debug("剩余牌的数量:" + this.pais.length);
    //return 1;
    return this.pais.length;
}

/**
 * 发具体的牌
 */
Pool.prototype.qiPaiDebug = function (pai) {
    logger.debug("gmPaiDebug:%j", pai);
    this.paiGot = this.getPai(pai);
    if (!this.paiGot || this.paiGot == null) {
        return null;
    }
    return this.paiGot;
};

Pool.prototype.getPai = function (str) {
    for (var j = 0; j < this.pais.length; j++) {
        //logger.debug("getPai:" + this.pais[j].type + "  value:" + this.pais[j].value + "str:" + str);
        if (this.pais[j].type == str[0] && this.pais[j].value == str[1]) {
            var res = this.pais.splice(j, 1);
            return res[0];
        }
    }
    return null;
}
module.exports = Pool;