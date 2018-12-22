
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType()+'-log', __filename);

var majhongPool = require('../../algorithm/majhongPool');
var util = require('util');
var utils = require('../../util/utils');

var Card = function(opts) {
    majhongPool.call(this, opts);
};

util.inherits(Card, majhongPool);


Card.prototype.kaiPai=function()
{

    var pais = this.pais.slice(0, this.pais.length - 1);
    var len = pais.length;

    for (var j=len-1; j>=0; j--) {
        if (pais[j].type == 'H') {
            pais.splice(j, 1);
        }
    }

    logger.debug("剩余金牌堆数量:%j",pais);
    var i = utils.random(0, pais.length-1);

//    var jin =this.genPai("F1");
//    return jin;
//        logger.debug(i);
//        logger.debug("翻牌22:"+(pais.length-1));
//        var tem=''+pais[i].type+pais[i].value;
//        logger.debug("翻牌111:"+tem);
    var kaipai=this.qiPai_debug(''+pais[i].type+pais[i].value);
    //var kaipai=this.qiPai_debug(''+"F4");
    logger.debug("翻牌:%j",kaipai);
    return kaipai;
}
Card.prototype.jinPai = function(pai) {

    var jin = undefined;
    if(pai.value==1 && pai.type!='F' && pai.type!='J')
    {
        jin={'type':pai.type,'value':9};
    }
    else if(pai.type == 'F'&& pai.value == 4)
    {
        jin={'type':"J",'value':1};
    }
    else if(pai.type == 'J'&& pai.value == 3)
    {
        jin={'type':"F",'value':1};
    }
    else if(pai.type == 'F')
    {
        var tem =0;
        if(pai.value==1)
        {
            tem=3;
        }
        else if(pai.value==2)
        {
            tem=4;
        }
        else if(pai.value==3)
        {
            tem=2;
        }
        jin=this.genPai(''+pai.type+tem);
    }
    else if(pai.type == 'J')
    {
        jin= this.genPai(''+pai.type+(pai.value+1));
    }
    else
    {
        jin= this.genPai(''+pai.type+(pai.value-1));
        //{'type':pai.type,'value':pai.value+1};
    }

    // jin = {'type':'T','value':8};
    logger.debug("获取一个金牌:%j, 翻牌 %j", jin,pai);

    return jin;
}

/*
 给每个玩家初始化手牌
 * */
Card.prototype.faPai = function(num,person,gmPais){
    //gm发牌
    logger.debug("发牌 :%d,人数:", num,person);
    logger.debug("gmPais:%j",gmPais);
    var pais = {};

    if(!!person)
    {
        for(var idx=0;idx<person;idx++)
        {
            if(!gmPais[idx])
            {
                gmPais[idx]=[];
            }
            pais[idx]=[];

            for(var tem = 0; tem <gmPais[idx].length; tem++)
            {
                if(idx==0 && pais[idx].length>= num+1)
                {
                    break;
                }
                else if(idx!=0 && pais[idx].length>=num)
                {
                    break;
                }
                else
                {
                    var pai=this.getPai(gmPais[idx][tem]);
                    if(pai!=null)
                        pais[idx].push(pai);
                }
            }
        }
        for(var idx=0;idx<person;idx++)
        {
            if(num>pais[idx].length)
            {
                var sub=num-pais[idx].length;
                var temPais = this.pais.splice(0, sub);
                pais[idx]= pais[idx].concat(temPais);
            }
            if(idx==0)
            {
                if(pais[idx].length<num+1)
                {
                    var temPais = this.pais.splice(0, 1); // 庄家的牌
                    pais[idx]=pais[idx].concat(temPais);
                }
            }
        }
    }

    logger.debug("发牌11111：%j",pais);
    return pais

}
module.exports = Card;


