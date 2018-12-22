/**
 * Created by fyw2515 on 2017/12/4.
 */
module.exports = {
    TABLESTATUS :
    {
        UNGAME:0,           //没有游戏状态还从没开始过
        SLEEP:1,            //休眠状态 没有开始（此时玩家人数不足）
        READY: 2,           //准备阶段 1秒进入下一阶段
        INITTABLE: 3,       //初始化牌桌阶段 包括 初始化玩家信息、数据信息、庄家判断、牌的初始化、洗牌、发牌
        GAMEING:4,          //游戏中状态
        GAMERESULT:5,        //游戏结果阶段 5秒给客户端展示阶段
        GAMEOVER:6           //游戏结束 桌子解散
    },
    READYSTATUS: {
        UNREADY: 0,          //未准备
        READY: 1            //准备
    },
    MAJHONGTYPE: {
        "tian": "tian",
        "chi": "chi",
        "peng": "peng",
        "gang": "gang",
        "bu": "bu",
        "hu": "hu",
        "ting": "ting",
        "guo": "guo"
    },
    PLAYEROPTYPE: {
        "CHUPAI": "CHUPAI",
        "MOPAI": "MOPAI",
        "GANG": "GANG",
        "BU": "BU"
    },
    MAJHONGTYPE : {
        "tian" : "tian",
        "chi" : "chi",
        "peng" : "peng",
        "gang" : "gang",
        "bu" : "bu",
        "hu" : "hu",
        "ting":"ting",
        "guo" : "guo"
    },
    PLAYEROPTYPE : {
        "CHUPAI":"CHUPAI",
        "MOPAI":"MOPAI",
        "GANG":"GANG",
        "BU":"BU"
    },
    //回放
    HUI_FANG_TYPE: {
        HUI_INITPAI: 0,          //第一步四个玩家的信息牌 座位 房主 庄闲等信息
        HUI_DELPAI: 1,           //玩家打牌
        HUI_MOPAI: 2,            //玩家摸牌
        HUI_NOTIFY_OP: 3,        //通知可以操作的玩家操作
        HUI_SYNC_OP: 4,          //同步所有人的操作
        HUI_SYNC_OP_RESULT: 5,   //同步最终操作结果
        HUI_NIAO: 6,             //同步鸟牌
        HUI_HAIDI: 7,             //同步海底捞月操作 特殊处理 因为要询问
        HUI_HUA: 8,               //补花
        HUI_JIN: 9                //开金
    }
}