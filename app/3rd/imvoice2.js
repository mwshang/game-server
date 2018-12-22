var https = require("https");
var http = require("http");
var url = require("url");
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);

//亲佳IM  http://www.gotye.com.cn/docs/ime/restapi.html
/*
 3001	roomId为空
 3003	无效的roomId
 3005	room对象为空
 3007	无效的roomType
 3009	超过app最大创建聊天室个数
* */

var IMConfig = {
    expired_in : 0,      // token 超时
    api_url : "",         // api调用路径
    access_token : undefined,   // access token
    app_key : "gl4y3b6xo22apwlh06p06m",
    expired_in_second : 0 // 多少秒后超时
}

exports.IMVoice = function(){
    this.expired_in = IMConfig.expired_in;        // token 超时
    this.api_url = IMConfig.api_url;          // api调用路径
    this.access_token = IMConfig.access_token;   // access token
    this.app_key = IMConfig.app_key;
    this.expired_in_second = IMConfig.expired_in_second; // 多少秒后超时
    var self = this;
    
    this.tokenExpired = function () {
        var nowTime = Date.now() / 1000;
        
        return self.expired_in_second < nowTime;
    } 

       
    this.GetToken = function(_cb) {
        if (this.access_token === undefined || this.tokenExpired()) {
            if (this.access_token === undefined){
                logger.debug("request gettoken:" + this.access_token);
            }
            var urlInfo = url.parse("https://api.gotye.com.cn/api/accessToken");
            var options = {
                method:'POST',
                host:urlInfo.hostname,
                port:urlInfo.protocol == "https:" ? 443 : 80,
                path:urlInfo.path,
                headers:{
                    "Accept":"application/json",
                    "Content-Type":'application/json'
                }
            }

            var post_data = {
               "grant_type": "client_credentials",
               "client_id": this.app_key,
               "client_secret": "5360bfa6b48a4d5d80df67849774ede2"
            }

            var getObjStr = function(obj) {
                var description = ""; 
                for(var i in obj){ 
                    var property=obj[i]; 
                    description+=i+" = "+property+"\n"; 
                } 
                return description
            }

            this.Post(options, post_data, urlInfo.protocol, function(data, err) {
                logger.debug("accessToken back-----");
                logger.debug("accessToken back:" + getObjStr(data));
                if (!!err) {
                    logger.debug("accessToken err:" + err);
                    _cb(undefined, err);
                    return;
                }
                if (!!data.errorDesc){
                    _cb(undefined, data.errorDesc);
                    return;
                }
                if (!!data.status){
                    if (data.status != 200){
                        logger.debug("语音调用返回错误码:%j", data);
                        _cb(undefined, data.status+"")
                        return;
                    }
                }
                //{"api_url":"http://api.gotye.com.cn/api","expires_in":86400,"access_token":"365ddedc6852ff56ea43dc9e6e301394"}
                IMConfig.expired_in = self.expired_in = data.expires_in;      // token 超时
                IMConfig.api_url = self.api_url = data.api_url;            // api调用路径
                IMConfig.access_token = self.access_token = data.access_token;  // access token

                if (self.expired_in == undefined || !self.expired_in){
                    IMConfig.expired_in = self.expired_in = 86400;
                }
                IMConfig.expired_in_second = self.expired_in_second = self.expired_in + Date.now() / 1000;
		          logger.debug("IMConfig info:%j", IMConfig);
                _cb(self.access_token, undefined);
            });
        } else {
            logger.debug("getCache Token");
            _cb(this.access_token, undefined);
        }
    }    

    this.Post = function(_options, _post_data, _protocol, _cb) {
        var req = (_protocol == "https:" ? https : http).request(_options, function(res){
            var res_data = "";
            res.on("error", function(err){
                _cb(undefined, err);
            });
            res.on("data", function(data) {
                res_data += data;
            });
            res.on("end", function() {
                var data = JSON.parse(res_data);
                _cb(data, undefined);
            });
        });
        req.on("error", function(err){
            _cb(undefined, err);
        });
        req.write(JSON.stringify(_post_data));
        req.end();
    }

    this.OpPost = function(_op, _post_data, _cb) {

        this.GetToken(function (_token, err) {
            if (!!err) {
                _cb(undefined, err);
                return;
            }

            if (self.api_url == undefined){
                _cb(undefined, "IM Error");
                return;
            }

            var urlInfo = url.parse(self.api_url);
            var options = {
                method:'POST',
                host:urlInfo.hostname,
                port:urlInfo.port,
                path:urlInfo.path + _op,
                headers:{
                    "Accept":"application/json",
                    "Content-Type":'application/json',
                    "Authorization": "Bearer " + self.access_token
                }
            }

            self.Post(options, _post_data, urlInfo.protocol, function (data, err) {
                if (data == undefined){
                    _cb(undefined, err);
                    return;
                } else {
                    if (data.status != 200){
                        logger.error("语音调用返回错误码:%j", _post_data);
                        logger.error("语音接口失败：%j", data);
                        _cb(undefined, data.status + "");
                        return;
                    }
                }
                logger.debug("imCB:%j", data);
                _cb(data, err);
            });
        });
    }

    // 创建房间
    this.CreateRoom = function (_roomName, _maxUserNumber, _cb){
        var post_data = {
            "appkey":this.app_key,
            "roomName":_roomName,                       // 聊天室名
            "head": undefined,                               // 房间头像
            "roomType":1,                               // 1.普通房间
            "scope": 0,                                 // 0.应用级别 1.开发者级别
            "maxUserNumber":parseInt(_maxUserNumber)    // 最大用户数量
        }
	logger.debug("CreateIMRoom msg:%j",post_data );
        this.OpPost("/CreateIMRoom", post_data, function(data, err) {
            if (!!err) {
                logger.debug("创建语音聊天室异常:%j",err );
               _cb(undefined, err);
               return;
            }

            logger.debug("创建语音聊天室成功：%j", data);
            _cb(data.entity, data.errorDesc);
        });
    }

    // 删除房间
    this.DelRoom = function (_roomId, _cb) {
        var post_data = {
            "appkey":this.app_key,
            "roomId":_roomId    // 聊天室名
        }
        logger.debug(post_data);
        this.OpPost("/DelIMRoom", post_data, function(data, err) {
            if (!!err) {
                logger.debug("删除房间失败:%j" , data);
                _cb(undefined, err);
                return;
            }
            logger.debug("删除房间成功：%j", data);
            _cb(_roomId, data);
        });
    }

    //获取具体某个聊天室
    this.GetRoomByID = function(_roomId, _cb){
        var post_data = {
            "appkey":this.app_key,
            "roomId":_roomId    // 聊天室名
        }
        logger.debug(post_data);
        this.OpPost("/GetIMRoom", post_data, function(data, err) {
            if (!!err) {
                logger.debug("获取具体房间失败:%j" , data);
                _cb(undefined, err);
                return;
            }
            logger.debug("获取具体房间成功：%j", data);
            _cb(_roomId, data);
        });
    }

    //获取聊天室列表
    /*
     "status": 200,
     "entities": [{
     "roomId": 340900,
     }]
    * */
    this.GetRoomLists = function(cb){
        var post_data = {
            "appkey":this.app_key,
            "names":[],
            "index": 0,
            "count":500
        }
        logger.debug(post_data);
        this.OpPost("/GetIMRooms", post_data, function(data, err) {
            if (!!err) {
                logger.debug("获取房间列表失败:%j" , err);
                cb(err);
                return;
            }
            logger.debug("获取房间列表成功");
            cb(data);
        });
    }

    // 创建群
    this.CreateGroup = function(_GroupName, _cb){
        var post_data = {
            "appkey":this.app_key,
            "groupName":_GroupName,
            "groupHead":undefined,
            "isPrivate":0,
            "ownerAccount":"DMFY",
            "needVerify":0,
            "groupInfo":""
        }

        this.OpPost("/CreateGroup", post_data, function (data, err){
            logger.debug(data);
            if (!!err) {
                _cb(undefined, err);
                return;
            }

            _cb(data.entity, data.errorDesc);
        });
    }
    
    // 删除群
    this.DismissGroup = function(_GroupId, _cb) {
        var post_data = {
            "appkey":this.app_key,
            "groupId":_GroupId   // 聊天室名
        }

        this.OpPost("/DismissGroup", post_data, function(data, err) {
            if (!!err) {
                _cb(undefined, err);
                return;
            }

            _cb(_GroupId, data.errorDesc);
        });
    }

    // 添加群成员
    this.AddGroupMember = function(_GroupId, _accountId, _cb) {
        var post_data = {
            "appkey":this.app_key,
            "groupId":_GroupId,    // 聊天室名
            "userAccount":_accountId
        }

        this.OpPost("/AddGroupMember", post_data, function(data, err) {
            if (!!err) {
                _cb(undefined, err);
                return;
            }

            _cb(_accountId, data.errorDesc);
        });
    }
    
    // 删除群成员
    this.DelGroupMember = function(_GroupId, _accountId, _cb) {

        var post_data = {
            "appkey":this.app_key,
            "groupId":_GroupId,    // 聊天室名
            "userAccount":_accountId
        }

        this.OpPost("/DelGroupMember", post_data, function(data, err) {
            if (!!err) {
                _cb(undefined, err);
                return;
            }

            _cb(_accountId, data.errorDesc);
        });
    }
}
