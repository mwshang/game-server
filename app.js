var pomelo = require('pomelo');
var sync = require('pomelo-sync-plugin');
var httpPlugin = require('pomelo-http-plugin');
var path = require('path');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);

var dataApi = require('./app/util/dataApi');
var ChatService = require('./app/services/chatService');
var gameService = require('./app/services/gameService');
var hall = require('./app/domain/hall/hall');
var packTable = require('./app/domain/pack/packTable');
var qpgames = require('./config/qpgames.json').games;

/**
 * Init app for client
 */
var app = pomelo.createApp();
app.set('name', 'yiqigame');
// app.enable('rpcDebugLog');

// configure for global
app.configure('production|development', function () {

    app.before(pomelo.filters.toobusy());
    app.enable('systemMonitor');

    // proxy configures
    app.set('proxyConfig', {
        cacheMsg: true,
        interval: 30,
        lazyConnection: true
    });

    // remote configures
    app.set('remoteConfig', {
        cacheMsg: true,
        interval: 30
    });

    // route configures
    app.route('connector', function (session, msg, app, cb) {
        if ( !session ) {
            cb(new Error('fail to route to connector server for session is empty'));
            return;
        }

        if ( !session.frontendId ) {
            cb(new Error('fail to find frontend id in session'));
            return;
        }

        cb(null, session.frontendId);
    });

    // route configures
    for (var i in qpgames) {
        var route = require('./app/domain/' + qpgames[i].serverType + '/route');
        app.route(qpgames[i].serverType, route.route);
    }

    app.loadConfig('mysql', app.getBase() + '/config/mysql.json');
    app.filter(pomelo.filters.timeout());
});

// Configure for auth server
app.configure('production|development', 'auth', function () {
    // load session congfigures
    app.set('session', require('./config/session.json'));
});

// Configure database
var gameServers = 'auth|connector|hall|http|pack';
for (var i in qpgames) {
    gameServers += ('|' + qpgames[i].serverType);
}
app.configure('production|development', gameServers, function () {
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);
    // app.load(pomelo.sync, {path:__dirname + '/app/dao/mapping', dbclient: dbclient});
    app.use(sync, {sync: {path: __dirname + '/app/dao/mapping', dbclient: dbclient}});
});

app.configure('production|development', 'connector', function () {
    var dictionary = app.components['__dictionary__'];
    var dict = null;
    if ( !!dictionary ) {
        dict = dictionary.getDict();
    }
    app.set('connectorConfig',
        {
            connector: pomelo.connectors.hybridconnector,
            // heartbeat : 300,
            //useDict : true,
            //useProtobuf : true,
            // handshake : function(msg, cb){
            // 	cb(null, {});
            // }
        });
});

// Configure for chat server
app.configure('production|development', 'chat', function () {
    app.set('chatService', new ChatService(app));
});

app.configure('production|development', 'hall', function () {
    logger.debug("hall create");
    app.set('hall', new hall());

    for (var i in qpgames) {

        logger.debug(qpgames[i].serverType + ' create');

        //config
        app.set(qpgames[i].serverType, require('./config/' + qpgames[i].configFile));
//        // message channel
//        app.set('gameService', new gameService(app));
//        // room manager
//        var room = require('./app/domain/' + qpgames[i].serverType + '/room');
//        app.set('roomMgr', new room(app));

    }
});

// http server configuration
app.configure('production|development', 'http', function () {
    app.loadConfig('httpConfig', path.join(app.getBase(), 'config/http.json'));
    app.use(httpPlugin, {
        http: app.get('httpConfig').http
    });
    app.use(httpPlugin, {
        http: app.get('httpConfig').wxhttp
    });
});

// game servers configuration
for (var i in qpgames) {
    app.configure('production|development', qpgames[i].serverType, function () {
        logger.error(qpgames[i].serverType + ' create');

        //config
        if ( !app.loadConfigBaseApp ) {
            app.set(qpgames[i].serverType, require('./config/' + qpgames[i].configFile));
        }
        else {
            var path = '/config/' + qpgames[i].configFile;
            app.loadConfigBaseApp(qpgames[i].serverType, path, true);
        }

        //logger.debug("配置:%j",app.get(qpgames[i].serverType));
        // message channel
        app.set('gameService', new gameService(app));
        // room manager
        var room = require('./app/domain/' + qpgames[i].serverType + '/room');
        app.set('roomMgr', new room(app));

        // 开启麻友圈功能
        if ( app.get(qpgames[i].serverType)["isOpenPack"] == 1 ) {
            var Pack = require('./app/domain/pack/pack');
            app.set('packMgr', new Pack(app));
        }
    });
}

if ( !app.loadConfigBaseApp ) {
    app.set('whites', require('./config/whites.json'));
}
else {
    app.loadConfigBaseApp('whites', './config/whites.json', true);
}

app.event.on(pomelo.events.START_SERVER, function (data) {
    var sType = data.split('-')[0];
    logger.debug('pomelo.events.START_SERVER', data, sType);
    if ( ['auth', 'master', 'chat', 'connector', 'http', 'hall', 'pack'].indexOf(sType) == -1 ) {
        app.get('hall') && app.get('hall').recycleServerTableNum(data);
    }
    if (sType == "hall") {
        app.get('hall') && app.get('hall').onServerAllStart();
    }
});
//start
app.start();

// Uncaught exception handler
process.on('uncaughtException', function (err) {
    logger.error(' Caught exception: ' + err.stack);
});
