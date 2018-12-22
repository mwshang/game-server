//'use strict';
var pomelo = require('pomelo');
var Event = require('../../../consts/consts').HALL;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var url = require('url');


// var httppingxx = require('../../../domain/http/httpPingxx');
var httpRegLogin = require('../../../domain/http/httpRegLogin');
var httpGM = require('../../../domain/http/httpGM');
var httpFK = require('../../../domain/http/httpFangKa');
var httpHall = require('../../../domain/http/httpHall');
var httpOrder = require('../../../domain/http/httpOrder');
var httpPack = require('../../../domain/http/httpPack');

module.exports = function(app, http, plugin) {
  http.all('*', function(req, res, next)
  {
      if (pomelo.app.get('serverStarted') == 0) {
          logger.error("服务器正在启动中");
          res.send({code: 200, error:'服务器正在维护中'});
          return;
      }
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

	if (plugin.useSSL)
    {
		http.get('/testHttps', function(req, res, next)
        {
			logger.debug(req.params);
			res.set('resp', 'https success');
			next();
		});
	}
    //http
    else {
    //注册
    http.post('/qp_register', function (req, res, next) {
      logger.debug("qp_register");
      logger.debug(req.body);
      httpRegLogin.register(req.body, res);
    });

    //登陆
    http.post('/qp_login', function (req, res, next) {
      logger.debug("qp_login");
      logger.debug(req.body);
      httpRegLogin.login(req.body, res);
    });

    // //支付ping
    // http.post('/pingOrderPay', function (req, res, next) {
    //   logger.debug("pingOrderPay");
    //   logger.debug(req.body);
    //   try {
    //     var event = req.body;
    //     logger.debug("event.type = " + event.type);
    //     if (event.type === undefined) {
    //       res.json({"Event 对象中缺少 type 字段": 400});
    //       next();
    //     }
    //     switch (event.type) {
    //       case "charge.succeeded":
    //         // 支付通知
    //         logger.debug("成功支付");
    //         res.send(200);
    //         httppingxx.chargePingxxOK(req.body, null);
    //         break;
    //       case "refund.succeeded":
    //         // 退款处理
    //         //return resp("OK", 200);
    //         res.send(200);
    //         break;
    //       default:
    //         logger.error("error");
    //         res.send(400);
    //         //return resp("未知 Event 类型", 400);
    //         break;
    //     }
    //   } catch (err) {
    //     logger.error(err);
    //     res.send(400);
    //     //return resp('JSON 解析失败', 400);
    //   }
    // });

    //GM
    http.post('/gmPlayerAttr', function (req, res, next) {
      logger.debug("qp_gm");
      logger.debug(req.body);
      httpGM.gmPlayerAttr(req.body, res);
    });

    //GM 三公游戏内部
    http.post('/gmSanGong', function (req, res, next) {
        logger.debug("gmSanGong");
        logger.debug(req.body);
        httpSG.gmSanGong(req.body, res);
    });
    //GM 房卡相关
    http.post('/gmFangKa', function (req, res, next) {
        logger.debug("gmFangKa");
        logger.debug(req.body);
        httpFK.gmFangKa(req.body, res);
    });
    http.post('/gmFangKaActive', function (req, res, next) {
        logger.debug("gmFangKaActive");
        logger.debug(req.body);
        httpFK.gmFangKaActive(req.body, res);
    });
      //GM
      http.post('/gmNotifyMsg', function (req, res, next) {
        logger.debug("gmNotifyMsg");
        logger.debug(JSON.stringify(req.body));
        httpGM.updateMsgHall(req.body, res);
      });
    http.post('/gmGetOnline', function (req, res, next) {
        logger.debug("gmGetOnline");
        logger.debug(req.body);
        httpGM.getHallPlayerNum(req.body, res);
    });
      //临时保存玩家数据
    http.post('/gmUpdateHuiFang', function (req, res, next) {
        logger.debug("gmUpdateHuiFang");
        logger.debug(req.body);
        httpGM.updatePlayerHuifang(req.body, res);
    });

     http.post('/gmLockPlayer', function (req, res, next) {
         logger.debug("gmLockPlayer");
         httpGM.lockPlayer(req.body, res);
     });
    // notice
    http.get('/api/notice', function (req, res, next) {
        logger.debug("getNoticeList", req.query);
        httpGM.getNoticeList(req.query, res);
    });

    // notice
    http.post('/gmNotifyList', function (req, res, next) {
        logger.debug("gmNotifyList", req.body);
        httpGM.getNoticeList(req.body, res);
    });

    http.post('/api/notice', function (req, res, next) {
        logger.debug("addNotice", req.body);
        httpGM.addNotice(req.body, res);
    });

    //WX
    // 验证签名
    http.get('/wx_checksignature', function (req, res, next) {
      var signature = require('wx_jsapi_sign');
      var wxPConfig = require('../../../../config/wxPubConfig')();

      var url = req.query.url;
      logger.debug(url);

      signature.checkSignature(wxPConfig)(req, res, next);
    });

    http.post('/wx_user', function (req, res) {
      var wxPConfig = require('../../../../config/wxPubConfig')();
      var wxAConfig = require('../../../../config/wxAppConfig')();
      var wxWConfig = require('../../../../config/wxWebConfig')();

      var OAuth = require('wechat-oauth');
      var wxClient = null;

      if (req.body.wxClient == 'wxpub')
        wxClient = new OAuth(wxPConfig.appId, wxPConfig.appSecret);
      else if (req.body.wxClient == 'wxapp')
        wxClient = new OAuth(wxAConfig.appId, wxAConfig.appSecret);
      else if (req.body.wxClient == 'wxweb')
        wxClient = new OAuth(wxWConfig.appId, wxWConfig.appSecret);

      wxClient.getAccessToken(req.body.code, function (err, result) {
        if (!!err || err != undefined){
            res.json({err: err});
            return;
        }
        var accessToken = result.data.access_token;
        logger.debug(accessToken);

        wxClient.getUser(result.data.openid, function (err, result) {
          res.json({user: result});
        });
      });
    });

    // 大厅设置
    http.post('/qp_getHallSettings', function (req, res, next) {
        logger.debug("qp_getHallSettings", req.body);
        httpHall.getHallSettings(req.body, res);
    });

    http.post('/qp_setHallSettings', function (req, res, next) {
        logger.debug("qp_setHallSettings", req.body);
        httpHall.setHallSettings(req.body, res);
    })

    // 获取回放记录
    http.post('/qp_getHuiFangInfo', function (req, res, next) {
      logger.debug("qp_getHuiFangInfo");
      logger.debug(req.body);
      httpHall.getHuiFangInfo(req.body, res);
    });

    // 获取回放列表
    http.post('/qp_getHuiFangList', function (req, res, next) {
      logger.debug("qp_getHuiFangList");
      logger.debug(req.body);
      httpHall.getHuiFangList(req.body, res);
    });

    // 创建比赛场
    http.post('/qp_createArena', function (req, res, next) {
      logger.debug("qp_createArena");
      logger.debug("%j",req.body);

        httpHall.createArena(req.body, res);
    });
    //删除比赛场
    http.post('/qp_removeArena', function (req, res, next) {
        logger.debug("qp_removeArena");
        logger.debug("%j",req.body);

        httpHall.removeArena(req.body, res);
    });
    //获取比赛场列表
    http.post('/qp_getCanJoinArenaList', function (req, res, next) {
        logger.debug("qp_getCanJoinArenaList");
        logger.debug("%j",req.body);

        httpHall.getCanJoinArenaList(req.body, res);
    });
    // 获取比赛场报名用户
    http.post('/qp_getArenaEnrolledList', function (req, res, next) {
      logger.debug("qp_getArenaEnrolledList");
        logger.debug("%j",req.body);
      httpHall.getArenaEnrolledList(req.body, res);
    });
    // 进入比赛场
    http.post('/qp_enterArena', function (req, res, next) {
        logger.debug("qp_enterArena");
        logger.debug("%j",req.body);
        httpHall.enterArena(req.body, res);
    });
    // 验证密码
    http.post('/qp_checkArenaPwd', function (req, res, next) {
        logger.debug("checkArenaPwd");
        logger.debug("%j",req.body);
        httpHall.checkArenaPwd(req.body, res);
    });
    // 报名
    http.post('/qp_enrollArena', function (req, res, next) {
      logger.debug("qp_enrollArena");
        logger.debug("%j",req.body);
      httpHall.enrollArena(req.body, res);
    });
    // 取消报名
    http.post('/qp_cancelEnrollArena', function (req, res, next) {
        logger.debug("qp_cancelEnrollArena");
        logger.debug("%j",req.body);
        httpHall.cancelEnrollArena(req.body, res);
    });
    // 检查是否在比赛场中
    http.post('/qp_checkPlayerInArena', function (req, res, next) {
        logger.debug("qp_checkPlayerInArena");
        logger.debug("%j",req.body);
        httpHall.checkPlayerInArena(req.body, res);
    });
    // 审核
    http.post('/qp_auditArenaEnrollment', function (req, res, next) {
      logger.debug("qp_auditArenaEnrollment");
        logger.debug("%j",req.body);
      httpHall.auditArenaEnrollment(req.body, res);
    });
    // 获取比赛场结果列表
    http.post('/qp_getArenaList', function (req, res, next) {
        logger.debug("qp_getArenaList");
        logger.debug("%j",req.body);
        httpHall.getArenaList(req.body, res);
    });
    // 获取比赛场排行
    http.post('/qp_getArenaRankList', function (req, res, next) {
      logger.debug("qp_getArenaRankList");
      logger.debug("%j",req.body);
      httpHall.getArenaRankList(req.body, res);
    });

    // 开始比赛场
    http.post('/qp_arenaStart', function (req, res, next) {
        logger.debug("qp_arenaStart");
        logger.debug("%j",req.body);
        httpHall.arenaStart(req.body, res);
    });
    //关闭比赛场
    http.post('/qp_arenaClose', function (req, res, next) {
        logger.debug("qp_arenaClose");
        logger.debug("%j",req.body);
        httpHall.arenaClose(req.body, res);
    });
    http.post('/qp_closeTable', function (req, res, next) {
        logger.debug("qp_closeTable");
        logger.debug("%j",req.body);
        httpHall.closeTable(req.body, res);
    });
    //获取代开列表
    http.post('/qp_reCreateTables', function (req, res, next) {
        logger.debug("qp_reCreateTables");
        logger.debug("%j",req.body);
        httpHall.reCreateTables(req.body, res);
    });
    //获取产品订单号
    http.post('/qp_getOrder', function (req, res, next) {
        logger.debug("qp_getOrder");
        logger.debug("%j",req.body);
        httpOrder.getOrder(req.body, res);
    });
    //产品支付状态
    http.post('/qp_orderStatus', function (req, res, next) {
        logger.debug("qp_orderStatus");
        logger.debug("%j",req.body);
        httpOrder.qp_orderStatus(req.body, res);
    });

    //===================摇摇乐=========================

    http.post('/yyl/test', function (req, res, next) {
        logger.debug("/yyl/test");
        logger.debug("%j",req.body);
        httpYYL.yyltest(req.body, res);
    });

    http.get('/yyl/getCard', function (req, res, next) {
        logger.debug("/yyl/test");
        logger.debug("%j",req.body);
        httpYYL.getCard(req.body, res);
    });

    http.post('/yyl/bet', function (req, res, next) {
        logger.debug("/yyl/bet %j",req.body);
        httpYYL.bet(req.body, res);
    });

    http.post('/yyl/caiChi', function (req, res, next) {
        //{"uid":"100493"}
        logger.debug("/yyl/caiChi %j",req.body);
        httpYYL.getCaiChiNum(req.body, res);
    });

    http.post('/yyl/refreshRate', function (req, res, next) {
        logger.debug("/yyl/refreshRate %j",req.body);
        httpYYL.refreshRate(req.body, res);
    });

        http.post('/yyl/getRewardInfo', function (req, res, next) {
            logger.debug("/yyl/getRewardInfo %j",req.body);
            httpYYL.getRewardInfo(req.body, res);
        });

        http.post('/yyl/getLianZhongInfo', function (req, res, next) {
            logger.debug("/yyl/getLianZhongInfo %j",req.body);
            httpYYL.getLianZhongInfo(req.body, res);
        });

        //**********************群相关********************
        //创建群
        http.post('/qp_packCreate', function (req, res, next) {
            logger.debug("qp_packCreate");
            logger.debug("%j", req.body);
            httpPack.qp_createPack(req.body, res);
        });

        //获取群
        http.post('/qp_getPacks', function (req, res, next) {
            logger.debug("qp_getPacks");
            logger.debug("%j", req.body);
            httpPack.qp_getPacks(req.body, res);
        });

        //获取群
        http.post('/qp_getPackByNum', function (req, res, next) {
            logger.debug("qp_getPackByNum");
            logger.debug("%j", req.body);
            httpPack.qp_getPackByNum(req.body, res);
        });

        //用户所在的群
        http.post('/qp_getPlayerPack', function (req, res, next) {
            logger.debug("qp_getPlayerPack", req.body);
            httpPack.qp_getPlayerPack(req.body, res);
        });

        //更新群信息
        http.post('/qp_updatePackInfo', function (req, res, next) {
            logger.debug("qp_updatePackInfo");
            logger.debug("%j", req.body);
            httpPack.qp_updatePackInfo(req.body, res);
        });
        //设置群操作
        http.post('/qp_setOperatePack', function (req, res, next) {
            logger.debug("qp_setOperatePack");
            logger.debug("%j", req.body);
            httpPack.qp_setOperatePack(req.body, res);
        });
        //隐藏群
        http.post('/qp_hidePack', function (req, res, next) {
            logger.debug("qp_hidePack");
            logger.debug("%j", req.body);
            httpPack.qp_hidePack(req.body, res);
        });
        //删除群
        http.post('/qp_delPacks', function (req, res, next) {
            logger.debug("qp_getPacks");
            logger.debug("%j", req.body);
            httpPack.qp_delPacks(req.body, res);
        });

        //用户申请列表
        http.post('/qp_plyerApplyList', function (req, res, next) {
            logger.debug("qp_plyerApplyList", req.body);
            httpPack.qp_playerApplyList(req.body, res);
        });

        //用户取消申请
        http.post('/qp_playerCancelApply', function (req, res, next) {
            logger.debug("qp_playerCancelApply", req.body);
            httpPack.qp_playerCancelApply(req.body, res);
        });

        //申请加入群列表
        http.post('/qp_packApplyList', function (req, res, next) {
            logger.debug("qp_packApplyList", req.body);
            httpPack.qp_packApplyList(req.body, res);
        });

        //玩家申请加入群
        http.post('/qp_packApplyJoin', function (req, res, next) {
            logger.debug("qp_packApplyJoin");
            logger.debug("%j", req.body);
            httpPack.qp_packApplyJoin(req.body, res);
        });

        //审核加群申请
        http.post('/qp_packAuthApply', function (req, res, next) {
            logger.debug("qp_packAuthApply");
            logger.debug("%j", req.body);
            httpPack.qp_packAuthJoin(req.body, res);
        });

        //删除玩家
        http.post('/qp_delPackPlayer', function (req, res, next) {
            logger.debug("qp_delPackPlayer");
            logger.debug("%j", req.body);
            httpPack.qp_delPackPlayer(req.body, res);
        });

        //群成员列表
        http.post('/qp_getPackMembers', function (req, res, next) {
            logger.debug("qp_getPackPlayers");
            logger.debug("%j", req.body);
            httpPack.qp_getPackMembers(req.body, res);
        });

        // 退出群
        http.post('/qp_quitPack', function (req, res, next) {
            logger.debug("qp_quitPack", req.body);
            httpPack.qp_quitPack(req.body, res);
        });

        //创建群房间
        http.post('/qp_createAutoTable', function (req, res, next) {
            logger.debug("qp_createAutoTable");
            logger.debug("%j", req.body);
            httpPack.qp_createAutoTable(req.body, res);
        });
        // 自动房间配置列表
        http.post('/qp_getAutoTableSetting', function (req, res, next) {
            logger.debug("qp_getAutoTableSetting");
            logger.debug("%j", req.body);
            httpPack.qp_getAutoTableSetting(req.body, res);
        });

        // 获取群房间
        http.post('/qp_getPackRealTablesList', function (req, res, next) {
            logger.debug("qp_getPackTablesList");
            logger.debug("%j", req.body);
            httpPack.qp_getPackTablesListRpc(req.body, res);
        });

        // 获取群房间
        http.post('/qp_getPackTablesList', function (req, res, next) {
            logger.debug("qp_getPackTablesList");
            logger.debug("%j", req.body);
            httpPack.qp_getPackTablesList(req.body, res);
        });

        //禁用自动桌子
        http.post('/qp_setDisableAutoTable', function (req, res, next) {
            logger.debug("qp_cantGetAutoTable");
            logger.debug("%j", req.body);
            httpPack.qp_setDisableAutoTable(req.body, res);
        });

        //关闭 自动房间
        http.post('/qp_delPackAutoTable', function (req, res, next) {
            logger.debug("qp_delPackAutoTable");
            logger.debug("%j", req.body);
            httpPack.qp_delPackAutoTable(req.body, res);
        });

        //创建成员房间
        http.post('/qp_memberCreateTable', function (req, res, next) {
            logger.debug("qp_memberCreateTable");
            logger.debug("%j", req.body);
            httpPack.qp_memberCreateTable(req.body, res);
        });

        http.post('/qp_updateMemberNote', function (req, res, next) {
            logger.debug("qp_updateMemberNote", req.body);
            httpPack.qp_updateMemberNote(req.body, res);
        });

        //充值群房卡
        http.post('/qp_addPackFangka', function (req, res, next) {
            logger.debug("qp_addPackFangka", req.body);
            httpPack.qp_AddPackGem(req.body, res);
        });
        //提取群房卡
        http.post('/qp_drawPackGem', function (req, res, next) {
            logger.debug("qp_drawPackGem", req.body);
            httpPack.qp_drawPackGem(req.body, res);
        });

        //快速加入
        http.post('/qp_quickJoin', function (req, res, next) {
            logger.debug("qp_quickJoin", req.body);
            httpPack.qp_quickJoin(req.body, res);
        });

        http.post('/gmPackNotify', function (req, res, next) {
            logger.debug("gmPackNotify", req.body);
            httpPack.gmPackNotify(req.body, res);
        });

        // 群战绩
        http.post('/qp_packGameHistory', function (req, res, next) {
            logger.debug("qp_packGameHistory", req.body);
            httpPack.qp_packGameHistory(req.body, res);
        });
        // 大赢家
        http.post('/qp_packGameRecord', function (req, res, next) {
            logger.debug("qp_packGameRecord", req.body);
            httpPack.qp_packGameRecord(req.body, res);
        });

        // 邀请入群
        http.post('/qp_packInviteJoin', function (req, res, next) {
            logger.debug("qp_packInviteJoin", req.body);
            httpPack.qp_packInviteJoin(req.body, res);
        });

        http.post('/qp_updatePackNotice', function (req, res, next) {
            logger.debug("qp_updatePackNotice", req.body);
            httpPack.qp_updatePackNotice(req.body, res);
        });

        http.post('/qp_ttttt', function (req, res, next) {
            logger.debug("qp_updatePackNotice", req.body);
            httpPack.hall_getCurMemoryUsage(req.body, res);
        });
  }
};
