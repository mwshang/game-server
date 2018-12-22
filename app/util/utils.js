var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
const FS = require("fs");
const PATH = require('path');


var utils = module.exports;
//屏蔽字
var filterData=FS.readFileSync(PATH.join(__dirname, "filterStr.txt"),"utf-8");
var pbzArr = filterData.split('|');

// control variable of func "myPrint"
var isPrintFlag = false;
// var isPrintFlag = true;

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function(cb) {
  if(!!cb && typeof cb === 'function') {
    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

/**
 * clone an object
 */
utils.clone = function(origin) {
  if(!origin) {
    return;
  }

  var obj = {};
  for(var f in origin) {
    if(origin.hasOwnProperty(f)) {
      obj[f] = origin[f];
    }
  }
  return obj;
};

utils.size = function(obj) {
  if(!obj) {
    return 0;
  }

  var size = 0;
  for(var f in obj) {
    if(obj.hasOwnProperty(f)) {
      size++;
    }
  }

  return size;
};

// print the file name and the line number ~ begin
function getStack(){
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };
  var err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
}

function getFileName(stack) {
  return stack[1].getFileName();
}

function getLineNumber(stack){
  return stack[1].getLineNumber();
}

utils.myPrint = function() {
  if (isPrintFlag) {
    var len = arguments.length;
    if(len <= 0) {
      return;
    }
    var stack = getStack();
    var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
    for(var i = 0; i < len; ++i) {
      aimStr += arguments[i] + ' ';
    }
    logger.debug('\n' + aimStr);
  }
};
// print the file name and the line number ~ end

function json2array(json){
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function(key){
        result.push(json[key]);
    });
    return result;
}

function arrayToObject(arr) {
    var rv = {};
    for (var i = 0; i < arr.length; ++i)
        if (arr[i] !== undefined) rv[i] = arr[i];
    return rv;
}

utils.random = function (min, max) {
  if (max == null) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

utils.shuffle =function (arr) {
  var length = arr.length,
    shuffled = Array(length);
  for (var index = 0, rand; index < length; index++) {
    rand = utils.random(0, index);
    if (rand !== index) shuffled[index] = shuffled[rand];
    shuffled[rand] = arr[index];
  }

  return shuffled;
}

utils.shuffle1 = function(arr){
    var length = arr.length,
        temp,
        random;
    while(0 != length){
        random = Math.floor(Math.random() * length)
        length--;
        // swap
        temp = arr[length];
        arr[length] = arr[random];
        arr[random] = temp;
    }
    return arr;
}

utils.getDistance = function(lon1, lat1, lon2, lat2) {
    var DEF_PI = 3.14159265359; // PI
    var DEF_2PI = 6.28318530712; // 2*PI
    var DEF_PI180 = 0.01745329252; // PI/180.0
    var DEF_R = 6370693.5; // radius of earth

    var ew1, ns1, ew2, ns2;
    var dx, dy, dew;
    var distance;

    // 角度转换为弧度
    ew1 = lon1 * DEF_PI180;
    ns1 = lat1 * DEF_PI180;
    ew2 = lon2 * DEF_PI180;
    ns2 = lat2 * DEF_PI180;
    // 经度差
    dew = ew1 - ew2;
    // 若跨东经和西经180 度，进行调整
    if (dew > DEF_PI)
        dew = DEF_2PI - dew;
    else if (dew < -DEF_PI)
        dew = DEF_2PI + dew;
    dx = DEF_R * Math.cos(ns1) * dew; // 东西方向长度(在纬度圈上的投影长度)
    dy = DEF_R * (ns1 - ns2); // 南北方向长度(在经度圈上的投影长度)
    // 勾股定理求斜边长
    distance = Math.sqrt(dx * dx + dy * dy).toFixed(0);
    return distance;
}

utils.getFilterStr = function(oldStr){
    logger.debug("==getFilterStr==");

    if(!oldStr){
        logger.debug("oldStr is null %j",oldStr);
        return "";
    }

    if(!filterData){
        logger.error("filterData is null %j",filterData);
        return oldStr;
    }

    logger.debug("oldStr %j",oldStr);

    var allPBStr = [];

    for(var i = 0;i <pbzArr.length;i++){
        var curStr = pbzArr[i];
        if(oldStr.indexOf(curStr) != -1){
            allPBStr.push(curStr);
        }
    }

    //logger.debug("allPBStr1 %j",allPBStr);

    allPBStr.sort(function(a,b){
        return -(a.length - b.length);
    })

    //logger.debug("allPBStr2 %j",allPBStr);

    for(var i = 0;i <allPBStr.length;i++){
        var curStr = allPBStr[i];
        if(oldStr.indexOf(curStr) != -1){
            oldStr = oldStr.replace(curStr,'**');
        }
    }


    logger.debug("newStr %j",oldStr);

    return oldStr;
}