# wx_jsapi_sign(nodejs)

wx_jsapi_sign = wechat(微信) js-api signature implement.

[![npm version](https://badge.fury.io/js/wx_jsapi_sign.svg)](http://badge.fury.io/js/wx_jsapi_sign)

- 支持集群，将获得的前面写到cache.json里
- 使用cache.json保存，比如用redis省事，更省内存
- 足够小巧，便于集成

## Install 

    npm install --save wx_jsapi_sign

## Usage

copy config file

```
cp node_modules/wx_jsapi_sign/config.example.js config.js
```

**change appId && appSecret**

- [微信公众平台如何获取appid和appsecret](http://jingyan.baidu.com/article/6525d4b12af618ac7c2e9468.html)

then mount a route in app.js

```
var signature = require('wx_jsapi_sign');
var config = require('./config')();

....

app.post('/getsignature', function(req, res){
  var url = req.body.url;
  console.log(url);
  signature.getSignature(config)(url, function(error, result) {
        if (error) {
            res.json({
                'error': error
            });
        } else {
            res.json(result);
        }
    });
});
```

more usages see `test/public/test.html`

## Test

微信访问网址  `http://127.0.0.1:1342/test`


## 原作者博客

http://blog.xinshangshangxin.com/2015/04/22/%E4%BD%BF%E7%94%A8nodejs-%E8%B8%A9%E5%9D%91%E5%BE%AE%E4%BF%A1JS-SDK%E8%AE%B0%E5%BD%95/


## 微信接口

### getWechatToken

获取微信 access token，7200秒刷新一次 ( http://mp.weixin.qq.com/wiki/15/54ce45d8d30b6bf6758f68d2e95bc627.html )

参数：需要正确设置config.js


### getWechatJsapiTicket

获取微信 JS API 所要求的 ticket，7200秒刷新一次 ( http://mp.weixin.qq.com/wiki/7/aaa137b55fb2e0456bf8dd9148dd613f.html )

参数：需要正确设置config.js


### getWechatJsapiSign

根据用户参数生成微信 JS API 要求的签名 ( http://mp.weixin.qq.com/wiki/7/aaa137b55fb2e0456bf8dd9148dd613f.html )

参数：
 * `noncestr` 必须参数，使用者自己生成的一个随机字符串，签名用的noncestr必须与wx.config中的nonceStr相同
 * `timestamp` 必须参数，使用者在调用微信 JS API 时的Unix时间戳，签名用的timestamp必须与wx.config中的timestamp相同
 * `url` 必须参数，签名用的url必须是调用JS接口页面的完整URL，其中的特殊字符，例如&、空格必须转义为%26、%20，参考：http://www.w3school.com.cn/tags/html_ref_urlencode.html

