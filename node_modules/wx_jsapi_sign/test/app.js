var express = require('express'),
    http = require('http'),
    path = require('path'),
    fs = require('fs');
    var template = require('art-template');//此处基本无用
var config = require('./config')();
console.log(config);


var app = express();
app.configure(function() {
    app.set('port', process.env.PORT || 1342);

    template.config('base', '');
    template.config('extname', '.html');
    app.engine('.html', template.__express);
    app.set('view engine', 'html');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    // user
    // 这是用来 在接口配置信息 中验证的; 仅仅使用 JS-SDK 不需要使用;
    // app.use(signature.checkSignature(config));
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

var signature = require('../index');
var config = require('./config')();


app.get('/test', function(req, res) {
    var u = req.protocol + "://" + req.get('Host') + req.url;
    signature.getSignature(config)(u, function(error, result) {
        console.log(result);
        res.render(__dirname + '/public/test.html', result);
    });
});

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


http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
});
