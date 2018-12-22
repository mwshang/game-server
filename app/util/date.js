var Misc = require('./misc');

function DateTime() {
}

var prop = DateTime.prototype;
prop.__defineGetter__("Now", function() { return Date.now(); });

prop.DateFormat = function(curDate, format) {
    if (!format) {
        format = "yyyy-MM-dd HH:mm:ss";
    }
    var year = curDate.getFullYear();
    var month = Misc.GetTwoInt(curDate.getMonth() + 1);
    var day = Misc.GetTwoInt(curDate.getDate());
    var hours = Misc.GetTwoInt(curDate.getHours());
    var min = Misc.GetTwoInt(curDate.getMinutes());
    var seconds = Misc.GetTwoInt(curDate.getSeconds());
    var milliseconds = Misc.GetFourInt(curDate.getMilliseconds());
    format = format.replace(/yyyy/, year);
    format = format.replace(/MM/, month);
    format = format.replace(/dd/, day);
    format = format.replace(/HH/, hours);
    format = format.replace(/mm/, min);
    format = format.replace(/ss/, seconds);
    format = format.replace(/SSSS/, milliseconds);
    return format;
}

prop.IsSameDay = function(date1, date2) {
    var d1 = new Date(date1);
    var d2 = new Date(date2);
    if (d1.getFullYear() !== d2.getFullYear()) {
        return false;
    }
    if (d1.getMonth() !== d2.getMonth()) {
        return false;
    }
    if (d1.getDate() !== d2.getDate()) {
        return false;
    }
    return true;
}

/**
 * convert the date according to format
 * @param {Object} date
 * @param {String} format
 * @param {String}
 */
prop.timeFormat = function(date) {
    var _date = new Date(date);
    var n = _date.getFullYear();
    var y = _date.getMonth() + 1;
    var r = _date.getDate();
    var mytime = _date.toLocaleTimeString();
    var mytimes = n+ "-" + y + "-" + r + " " + mytime;
    return mytimes;
}
prop.timeHourFormat = function(date) {
    var _date = new Date(date);
    var n = _date.getFullYear();
    var y = _date.getMonth() + 1;
    var r = _date.getDate();
    var mytime = _date.getHours();
    var mytimes = n+ "-" + y + "-" + r + " " + mytime;
    return mytimes;
}

prop.timeLocalFormat = function(date) {
    var _date = new Date(date);
    var y = _date.getMonth() + 1;
    var r = _date.getDate();
    var mytime = _date.toLocaleTimeString();
    var mytimes =  y + "-" + r + " " + mytime;
    return mytimes;
}


var dateTime = new DateTime;
module.exports = dateTime;
