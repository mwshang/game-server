module.exports = {

  RES_CODE : {
    SUC_OK						: 1,		// success
    ERR_FAIL					: -1,		// Failded without specific reason
    ERR_USER_NOT_LOGINED		: -2,		// User not login
    ERR_CHANNEL_DESTROYED		: -10,		// channel has been destroyed
    ERR_SESSION_NOT_EXIST		: -11,		// session not exist
    ERR_CHANNEL_DUPLICATE		: -12,		// channel duplicated
    ERR_CHANNEL_NOT_EXIST		: -13		// channel not exist
  },
  Event:
  {
    chat:'onChat',
    chatIm:'imCreateRoom'
  },
  //游戏类型
  GameRoomType:
  {
      qpdouniu:"com.qp.hall.douniu",
      qpbuyu:"com.qp.hall.buyu",
      qpsangong:"com.qp.hall.sangong"
  },
  //系统消息 俗称邮件消息分为游戏 系统 聊天 喇叭等
  MailType:
  {
    mailSystem:1,
    mailGame:2,
    mailChat:3,
    mailFeedback:4
  },
  //领奖系统
  PODIUM_TYPE:
  {
    PODIUM_VIP: 1,      //VIP领奖相关
    PODIUM_FRIEND: 2,   //好友推荐奖相关
    PODIUM_GIVE: 3      //赠送金币相关
  },
  //商店
  SHOP_TYPE:
  {
      SHOP_COIN: 1,     //金币
      SHOP_VIP: 2,      //vip
      SHOP_LABA: 3,     //大喇叭
      SJOP_SHIWU:4      //实物相关
  },
  //AI类型
  AIType:
  {
      aiDouniu:"aiDouniu",
      aiSangong:"aiSangong",
      aiChangSha:"aiChangSha",
      aiChangChun:"aiChangChun",
      aiQuanZhou:"aiQuanZhou",
      aiPaoDeKuai:"aiPaoDeKuai",
      aiFuZhou:"aiFuZhou",
      aiQiDong:"aiQiDong",
      aiShiSanShui:"aiShiSanShui",
      aiJiangShan:"aiJiangShan",
      aiZaoZhuang:"aiZaoZhuang",
      aiShanXi:"aiShanXi",
      aiYuYao:"aiYuYao",
      aiQiDongBD:"aiQiDongBD",
      aiChiZhou:"aiChiZhou",
      aiXueZhan:"aiXueZhan",
      aiQiDongLJC:"aiQiDongLJC",
      aiDouDiZhu:"aiDouDiZhu",
      aiNingHai:"aiNingHai",
      aiJinYun:"aiJinYun",
      aiPaoHuZi:"aiPaoHuZi",
      aiFuYang:"aiFuYang"
  },
  //vip 权限
  VIPPOWER:{
      FANGKA:10     //vip 10可以赠送房卡
  },
  //游戏中同步给大厅需要保存数据的类型
  Sync2HallType:
  {
      playerInfoMsg:'playerInfoMsg',
      mailMsg:'mailMsg',        //以邮件的形式展示给客户端
      taskMsg:'taskMsg',        //以任务形式展现给客户端
      pingxx:'pingxx',          //充值相关
      gameRecord:'gameRecord',   //游戏基本记录如当日下注金额 赢的总金币个数等等
      fangKa:'fangKa',          //房卡消耗
      fangKaOffline:'fangKaOffline',//房卡消耗 代开模式 代开的人可能离线
      playedTime:'playedTime', //更新玩家 局数
      goldNum:'goldNum', //更新玩家 goldNum
      scoreNum: 'scoreNum'
  },
  //玩家属性变化原因
  AttriChangeType:
  {
      attrNone:0,
      attrContinueLogin:1,
      attrShop:2,
      attrSafeBox:3,
      attrPodium:4

  },
  ItemType:
  {
      itemChat:"itemChat"                     //大喇叭！
  },
  //消息大厅主动推送给CLIENT类型
  HALL:
  {
    hallLogin:"hallLogin",                      //登陆成功
    hallUpdatePlayerAttr:"hallUpdatePlayerAttr",//玩家属性更新
    hallBroadcastMsg:"hallBroadcastMsg", //广播大厅消息
    hallDayLoginMsg:"hallDayLoginMsg", //连续登陆消息
    hallSafeBox:"hallSafeBox",           //保险箱信息
    hallBagMsg:"hallBagMsg",                //背包信息
    hallGameIng:"hallGameIng",               //断线重连
    hallMessageNotify:"hallMessageNotify", //广播大厅微信宣传等等
    hallIntervalMessageNotify:"hallIntervalMessageNotify", //广播大厅微信宣传等等
    hallTempNotify:"hallTempNotify",         //临时公告 紧急事务等游戏通知

    hallArenaEnroll:"hallArenaEnroll",         //比赛场报名通知
    hallArenaAudit:"hallArenaAudit",         //比赛场报名审核通知
    hallArenaStart:"hallArenaStart",         //比赛场开始通知
    hallArenaPlayerIn:"hallArenaPlayerIn",         //有玩家加入比赛场广播
    hallArenaPlayerRemove:"hallArenaPlayerRemove",         //有玩家离开比赛场广播
    hallArenaRemove:"hallArenaRemove",  //比赛场解散广播
    hallArenaPwd:"hallArenaPwd",  //验证密码
    hallArenaState:"hallArenaState",  //比赛场状态
    hallArenaSendAward:"hallArenaSendAward",  //发送名词奖励
    hallArenaUp:"hallArenaUp",  //晋级,

    hallXuFei:"hallXuFei"  //房间续费主动推送
  },


  MajhongEvent:
  {
      //开始游戏
      mjGameStart:'mjGameStart',
      //当前桌子状态包括每个玩家的信息以及状态和当前桌子状态,
      mjTableStatus:'mjTableStatus',
        //恢复桌子到初始状态
      mjResetTable:"mjResetTable",
      //新一轮谁是庄家
      mjBankerResult:"mjBankerResult",
        //新玩家进入
      mjPlayerEnter:"mjPlayerEnter",
        //玩家离开
      mjPlayerLeave:"mjPlayerLeave",
      //玩家离线
      mjPlayerOffLine:"mjPlayerOffLine",
      //准备开始
      mjReadyStart:"mjReadyStart",
        //玩家准备状态
      mjReadyStatus:"mjReadyStatus",
        //发送给玩家手牌信息 闲13张 庄家14张
      mjSendHandCards:"mjSendHandCards",
        //牌局结果
      mjGameResult:"mjGameResult",
        //同步聊天
      mjChatStatus:"mjChatStatus",
        //同步扔道具
      mjThrowStatus:"mjThrowStatus",
      //状态改变
      mjPlayerInfoChange:"mjPlayerInfoChange",
      //发给某一个玩家牌
      mjPlayerMoCards:"mjPlayerMoCards",
      //同步某一个玩家摸了一张牌
      mjSyncPlayerMocards:"mjSyncPlayerMocards",
      //通知某个玩家可以做的操作类型 天胡 吃碰杠补过胡出牌
      mjNotifyPlayerOP:"mjNotifyPlayerOP",
      //同步某个玩家做了什么操作 天胡 吃碰杠补胡出牌
      mjSyncPlayerOP:"mjSyncPlayerOP",
      //通知某个玩家打牌
      mjNotifyDelCards:"mjNotifyDelCards",
      //同步某个玩家打了一张牌
      mjSyncDelCards:"mjSyncDelCards",
      //听的牌 数量改变
      mjTingChange:"mjTingChange",
      //同步鸟牌
      mjNiaoPai:"mjNiaoPai",
      //同步某个玩家天胡
      mjSyncPlayerTianHu:"mjSyncPlayerTianHu",

      //剩余多少张牌等临时参数
      mjSyncParams:"mjSyncParams",
      //是否海底捞月
      mjHaiDiPai:"mjHaiDiPai",
      //申请解散房间
      mjDissolutionTable:"mjDissolutionTable",
      //游戏总成绩
      mjGameOver:"mjGameOver",
      //通知某个玩家补花牌
      mjHuaPai:"mjHuaPai",
      //同步某个玩家补花牌 群发
      mjSyncHuaPai:"mjSyncHuaPai",
      //金牌
      mjJinPai:"mjJinPai",
      //通知某个玩家大胡预判
      mjNotifyDaHu:"mjNotifyDaHu",
      // 通知听牌建议
      mjNotifyTingChoice: "mjNotifyTingChoice",
      //同步宝牌
      mjBaoPai:"mjBaoPai",
      //定位
      mjLocalPosition:"mjLocalPosition",
      //同步玩家明牌
      mjSyncShowTing:"mjSyncShowTing",
      //托管状态变化
      mjSyncAutoState:"mjSyncAutoState",

      //色子
      mjSaiZi:"mjSaiZi",
      //即时扣分彩头
      mjCaiTou:"mjCaiTou",
      //买庄通知
      mjMaiZhuang:"mjMaiZhuang",
      //搁百搭
      mjGeBaida:"mjGeBaida",

      //血战系列
      //换3张通知
      mjHuan3Start:"mjHuan3Start",
      //换3张同步
      mjHuan3Status:"mjHuan3Status",
      //换3张结果
      mjHuan3End:"mjHuan3End",
      //定缺开始
      mjDingQueStart:"mjDingQueStart",
      //定缺同步
      mjDingQueEnd:"mjDingQueEnd",

      //同步状态
      mjSyncLessPersonStatus:"mjSyncLessPersonStatus",

      //通知某个玩家自动打牌
      mjNotifyAutoDelCards:"mjNotifyAutoDelCards",
      //通知某个玩家自动过牌
      mjNotifyAutoGuo:"mjNotifyAutoGuo",
      //桌子折庄状态
      mjNotifyZheZhuang:"mjNotifyZheZhuang",

      //同步最后四张牌
      mjSyncLastFourPai:"mjSyncLastFourPai",

      // 同步偎牌
      mjSyncWeiCards: "mjSyncWeiCards",
      // 同步提牌
      mjSyncTiCards: "mjSyncTiCards",
      //同步胡息
      mjSyncHuXi:"mjSyncHuXi",
  },

    //武汉麻将胡牌类型
    WuHanHuType:{
        PingHu:0,//普通胡
        QingYiSe:1,//全部是一种花色 例如全部是万
        PengPengHu:2,//都是碰 的牌 没有吃的
        QiXiaoDui:3,//七小对  11 22 33 44 55 66 77
        QiXiaoDui1:4,//豪华七小对 就是有四个一样的例如11 11 22 33 44 55 66
        QiXiaoDui2:5,//双豪华  11 11 22 22 33 44 55
        QiXiaoDui3:6,//3豪华  11 11 22 22 33 33 44
        QuanQiuRen:7,//全球人 顾名思义手上只剩下一个牌就是全球人 全部靠别人打下去只剩下一个牌了
        JiangJiangHu:8,//将将胡 手上全部都是2 5 8
        GangKaiHua:9,//杠牌 杠出自己胡的牌
        QiangGangHu:10,//A选择杠  B正好胡A的杠 那么抢杠胡 暗杠不能抢
        GangShangPao:11,//A杠 杠出别人胡的牌 别人胡了
        HaiDiLaoYue:12,//海底牌 最后一张
        HaiDiPao:13,// 海底炮
        MenQing:14,//门清 谁也不靠并且自摸
        YiTiaoLong:15, //一条龙
        ShiSanYao:16,  //十三幺
        FengYiSe:17   //风一色

    },

 

     YaoYaoLePaiType:{
        HuangJiaTongHuaShun:1,
        TongHuaShun:2,
        SiTiao:3,
        HuLu:4,
        TongHua:5,
        ShunZi:6,
        SanTiao:7,
        LiangDui:8,
        YiDui:9
    },

    PackEvent: {
        //通知玩家登陆
        packNotifyPlayerEnter:    "packNotifyPlayerEnter",
        //通知玩家离线
        packNotifyPlayerLeave:    "packNotifyPlayerLeave",
        //通知在线玩家列表
        packNotifyOnlineList:     "packNotifyOnlineList",
        //通知玩家状态变化
        packNotifyPlayerState:     "packNotifyPlayerState",
        //通知房间状态变化
        packNotifyTableState:     "packNotifyTableState",
        //通知房间增加
        packNotifyTableAdd:       "packNotifyTableAdd",
        //通知房间增加
        packNotifyTableClose:      "packNotifyTableClose",
        //通知玩家加入
        packNotifyJoin:           "packNotifyJoin",
        //通知玩家申请被拒绝
        packNotifyRejectJoin:     "packNotifyRejectJoin",
        //通知玩家邀请加入游戏
        packNotifyJoinGame:     "packNotifyJoinGame",
        //通知俱乐部状态
        packNotifyState:        "packNotifyState"
    },

    TaskType: {
        JoinGame: 1000,
        WinGame: 2000,
        BigWinner: 3000,
        JoinPackGame: 4000,
        CreateRoom: 5000
    }
};
