/**
 * Created by bruce.yang on 2017/3/19.
 */
var logger = require('pomelo-logger').getLogger('majhong-log', __filename);

var Majhong = function () {
  // 数据格式:类型=value/100, 数值=value%10
  // [111-119] 万
  // [211-219] 饼
  // [311-319] 条
  // [411-417] 中发白东西南北
  this._data = [
  [],//   101, 102, 103, 104, 105, 106, 107, 108, 109, //万
  [],//   201, 202, 203, 204, 205, 206, 207, 208, 209, //饼
  [],//   301, 302, 303, 304, 305, 306, 307, 308, 309, //条
  [] //   401, 402, 403, 404, 405, 406, 407 //中 发 白 东 西 南 北
  ];

  this._type = {
    'W':1,
    'B':2,
    'T':3,
    'Z':4,
    '1':'W',
    '2':'B',
    '3':'T',
    '4':'Z'
  };

  this.maxLaiziNum = 4; // 癞子牌最多个数
  this.laizi = 0; // 癞子牌
  this.laiziNum = 0; // 癞子牌数
  this.needLzNum = 0; // 计算胡牌需要的癞子数

  this.lastPai = 0; // 最近一张加进来的牌
  this.jiangPai = 0; // 将牌
  this.jiang258 = false; // 是否要258做将牌
  this.area = 'quanzhou'; // 麻将地区  quangang  quanzhou  dehua  fuzhou

  this.callTime = 0; // 统计执行性能
};

var proto = Majhong.prototype;

proto._transform = function(pai) {
  var _tPai = {type: pai.type, value: pai.value};

  if (this.area == 'quanzhou' || this.area == 'quangang'|| this.area == 'yongchun'
      || this.area == 'dehua'|| this.area == 'yuyao' || this.area == 'jiangshan'
      || this.area == 'shanxi'|| this.area == 'qidong' || this.area == 'qidongbd'
      || this.area == 'qidongljc'  || this.area =='wuhan' || this.area =="xuezhan" || this.area =="chizhou"
      || this.area == 'ninghai'|| this.area == 'jinyun'|| this.area == 'weinan'|| this.area == 'heyang'|| this.area == 'fuyang') {
    if (pai.type == 'J')
      _tPai.type = 'Z';
    else if (pai.type == 'F') {
      _tPai.type = 'Z';
      _tPai.value += 3;
    } else if (pai.type == 'H')
      return null;
  } else if (this.area == 'quangang') {
    if (pai.type == 'J' && pai.value != 3)
      _tPai.type = 'Z';
    else if (pai.type == 'F') {
      _tPai.type = 'Z';
      _tPai.value += 3;
    } else if (pai.type == 'H' || pai.type == 'J')
      return null;
  } else if (this.area == 'fuzhou') {
    if (pai.type == 'J' || pai.type == 'F' || pai.type == 'H')
      return null;
  }


  return _tPai;
}

proto._transformR = function(pai) { // 逆转箭牌风牌
  var t = parseInt(pai/100);
  var type = this._type[t];
  var value = parseInt(pai%10);

  if (this.area == 'quanzhou' || this.area == 'quangang'|| this.area == 'yongchun'
      || this.area == 'dehua'|| this.area == 'yuyao' || this.area == 'jiangshan'
      || this.area == 'shanxi' || this.area == 'qidong' || this.area == 'ninghai'
      || this.area == 'qidongbd' || this.area == 'qidongljc'  || this.area =='wuhan'
      || this.area =="xuezhan" || this.area =="chizhou" || this.area == 'jinyun'
      || this.area == 'weinan' || this.area == 'heyang'|| this.area == 'fuyang') {
    if (type == 'Z') {
      if (value < 4)
        type = 'J';
      else {
        type = 'F';
        value = value - 3;
      }
    }
  }

  // logger.debug('_transformR:', pai, type, value);

  return {type: type, value: value};
}

proto.clear = function () {
  this._data = [
    [],//   101, 102, 103, 104, 105, 106, 107, 108, 109, //万
    [],//   201, 202, 203, 204, 205, 206, 207, 208, 209, //饼
    [],//   301, 302, 303, 304, 305, 306, 307, 308, 309, //条
    [] //   401, 402, 403, 404, 405, 406, 407 //中 发 白 东 西 南 北
  ];

  this.laizi = 0; // 癞子牌
  this.laiziNum = 0; // 癞子牌数
  this.needLzNum = 0; // 计算胡牌需要的癞子数

  this.callTime = 0; // 统计执行性能
}

proto.addPai = function (pai) {
  pai = this._transform(pai);
  if (pai == null)
    return;

  //logger.debug('addPai', this._data, this._type, pai);
  var rowData = this._data[this._type[pai.type] - 1];
  this.lastPai = parseInt(this._type[pai.type]+'0'+pai.value);
  rowData.push(this.lastPai);
  rowData.sort(function (a, b) {
    return a-b;
  })
};

proto.delPai = function (pai, num) {
  pai = this._transform(pai);
  if (pai == null)
    return;

  var rowData = this._data[this._type[pai.type] - 1];
  var pos = -1;
  pai = parseInt(this._type[pai.type]+'0'+pai.value);
  for (var i=0; i<rowData.length; i++) {
    if (rowData[i] == pai) {
      pos = i;
      break;
    }
  }

  if (pos > -1) {
    if (num != undefined) {
      rowData.splice(pos, num);
    } else {
      rowData.splice(pos, 1);
    }
  }
};

proto._checkPu = function (pai1, pai2, pai3) { // 是否满足刻字或顺子
  var t1 = parseInt(pai1/100), v1 = pai1%10;
  var t2 = parseInt(pai2/100), v2 = pai2%10;
  var t3 = parseInt(pai3/100), v3 = pai3%10;

  if (t1 != t2 || t1 != t3)
    return false;
  if (v1 == v2 && v1 == v3)
    return true;
  if (t3 == 4)
    return false;
  if (v1+1 == v2 && v2+1 == v3)
    return true;
  return false;
};

proto._checkJiang = function (pai1, pai2) { // 是否满足将
  var t1 = parseInt(pai1/100), v1 = pai1%10;
  var t2 = parseInt(pai2/100), v2 = pai2%10;

  if (this.jiang258 && (v1 != 2 && v1 != 5 && v1 != 8))
    return false;
  if (t1 == t2 && v1 == v2)
    return true;
  return false;
};

proto._getModNeedNum = function (arrLen, hasJiang) { // 根据花色数组长度 大致判断需要的癞子数
  if (arrLen <= 0)
    return 0;

  var modNum = arrLen % 3;
  var needNumArr = [0,2,1];
  if (hasJiang)
    needNumArr = [2,1,0]
  return needNumArr[modNum];
};

proto._getNeedLzInSub = function (subArr, lzNum) { // 计算花色数组凑整扑需要的癞子数
  this.callTime += 1;

  if (this.needLzNum == 0)
    return;

  var lArr = subArr.length;
  if (lzNum + this._getModNeedNum(lArr, false) >= this.needLzNum)
    return;

  if (lArr == 0) {
    this.needLzNum = Math.min(lzNum, this.needLzNum);
    return;
  } else if (lArr == 1) {
    this.needLzNum = Math.min(lzNum + 2, this.needLzNum);
    return;
  } else if (lArr == 2) {
    var t = parseInt(subArr[0] / 100);
    var v0 = subArr[0] % 10;
    var v1 = subArr[1] % 10;

    if (t == 4) {// 东南西北中发白（无顺）
      if (v0 == v1) {
        this.needLzNum = Math.min(lzNum + 1, this.needLzNum);
        return;
      } else { // 两个不同的牌 凑两个扑需要4张牌
        this.needLzNum = Math.min(lzNum + 4, this.needLzNum);
        return;
      }
    } else if ((v1 - v0) < 3) { // 两个牌之间只差一张牌 加一个癞子凑扑
      this.needLzNum = Math.min(lzNum + 1, this.needLzNum);
      return
    } else { // 两个牌不能凑到一个扑 凑两个扑就需要4张牌
      this.needLzNum = Math.min(lzNum + 4, this.needLzNum);
      return
    }
  } else if (lArr >= 3) { // 大于三张牌
    var t = parseInt(subArr[0] / 100);
    var v0 = subArr[0] % 10;
    var v1 = subArr[1] % 10;
    var v2 = subArr[2] % 10;

    //第一个和另外两个一铺
    var arrLen = subArr.length;
    for (var i=1; i<arrLen; i++) {
      if (lzNum + this._getModNeedNum(lArr - 3, false) >= this.needLzNum)
        break;

      v1 = subArr[i] % 10;
      if (v1 - v0 > 1) // 13444  134不可能连一起
        break;

      if (i + 2 < arrLen) {
        if (subArr[i + 2] % 10 == v1)
          continue;
      }

      if (i + 1 < arrLen) {
        var tmp1 = subArr[0];
        var tmp2 = subArr[i];
        var tmp3 = subArr[i+1];

        if (this._checkPu(tmp1, tmp2, tmp3)) {
          subArr.splice(i+1, 1);
          subArr.splice(i, 1);
          subArr.splice(0, 1);
          this._getNeedLzInSub(subArr, lzNum);
          subArr.splice(0, 0, tmp1);
          subArr.splice(i, 0, tmp2);
          subArr.splice(i+1, 0, tmp3);
        }
      }
    }

    if (lzNum + this._getModNeedNum(lArr - 2, false) + 1 < this.needLzNum) {     // 第一个和第二个一铺
      if (t == 4) { // 东南西北中发白（无顺）
        v1 = subArr[1] % 10;
        if (v0 == v1) {
          var tmp1 = subArr[0];
          var tmp2 = subArr[1];
          subArr.splice(1, 1);
          subArr.splice(0, 1);
          this._getNeedLzInSub(subArr, lzNum + 1);
          subArr.splice(0, 0, tmp1);
          subArr.splice(1, 0, tmp2);
        }
      } else {
        var arrLen = subArr.length;
        for (var i=1; i<arrLen; i++) {
          if (lzNum + this._getModNeedNum(lArr - 2, false) + 1 >= this.needLzNum)
            break;
          v1 = subArr[i] % 10;
          // 如果当前的value不等于下一个value则和下一个结合避免重复
          if (i + 1 != arrLen) {
            v2 = subArr[i + 1] % 10;
            if (v1 == v2) {
              continue;
            }
          }
          var mius = v1 - v0;
          if (mius < 3) {
            var tmp1 = subArr[0];
            var tmp2 = subArr[1];
            subArr.splice(1, 1);
            subArr.splice(0, 1);
            this._getNeedLzInSub(subArr, lzNum + 1);
            subArr.splice(0, 0, tmp1);
            subArr.splice(1, 0, tmp2);
            if (mius >= 1)
              break;
          } else
            break;
        }
      }
    }

    if (lzNum + this._getModNeedNum(lArr - 1, false) + 2 < this.needLzNum) { // 第一个自己一铺
      var tmp = subArr[0];
      subArr.splice(0, 1);
      this._getNeedLzInSub(subArr, lzNum + 2);
      subArr.splice(0, 0, tmp);
    }
  }
};

proto._canHu = function(arr, lzNum, huInfo) {
  var tmpArr = [];
  tmpArr = arr.concat();
  var arrLen  = tmpArr.length;
  if (arrLen <= 0) {
    if (lzNum >= 2) {
      this.jiangPai = this.laizi;
      return true;
    }
    return false;
  }

  if (lzNum < this._getModNeedNum(arrLen, true))
    return false;

  for (var i=0; i<arrLen; i++) {
    if (i == arrLen - 1) { // 如果是最后一张牌
      if (lzNum > 0) {
        var tmp = tmpArr[i];
        lzNum = lzNum - 1;
        tmpArr.splice(i, 1);
        this.needLzNum = this.maxLaiziNum;
        this._getNeedLzInSub(tmpArr, 0);
        if (this.needLzNum <= lzNum) {
          if (this.jiang258) {
            if (tmp%10 == 2 || tmp%10 == 5 || tmp%10 == 8) {
              this.jiangPai = tmp;
              return true;
            }
          } else {
            this.jiangPai = tmp;
            return true;
          }
        }
        lzNum = lzNum + 1;
        tmpArr.splice(i, 0, tmp);
      }
    } else {
      if (i + 2 == arrLen || tmpArr[i] % 10 != tmpArr[i + 2] % 10) {
        if (this._checkJiang(tmpArr[i], tmpArr[i + 1])) {
          var tmp1 = tmpArr[i];
          var tmp2 = tmpArr[i + 1];
          tmpArr.splice(i + 1, 1);
          tmpArr.splice(i, 1);
          this.needLzNum = this.maxLaiziNum;
          this._getNeedLzInSub(tmpArr, 0);
          if (this.needLzNum <= lzNum) {
            if (this.jiang258) {
              if (tmp1%10 == 2 || tmp1%10 == 5 || tmp1%10 == 8) {
                this.jiangPai = tmp1;
                return true;
              }
            } else {
              this.jiangPai = tmp1;
              return true;
            }
          }
          this.jiangPai = 0;
          tmpArr.splice(i, 0, tmp1);
          tmpArr.splice(i + 1, 0, tmp2);
        }
      }

      if (lzNum > 0 && tmpArr[i] % 10 != tmpArr[i + 1] % 10) {
        lzNum = lzNum - 1;
        var tmp = tmpArr[i];
        tmpArr.splice(i, 1);
        this.needLzNum = this.maxLaiziNum;
        this._getNeedLzInSub(tmpArr, 0);
        if (this.needLzNum <= lzNum) {
          if (this.jiang258) {
            if (tmp%10 == 2 || tmp%10 == 5 || tmp%10 == 8) {
              this.jiangPai = tmp;
              return true;
            }
          } else {
            this.jiangPai = tmp;
            return true;
          }
        }
        lzNum = lzNum + 1;
        tmpArr.splice(i, 0, tmp);
      }
    }
  }

  return false;
};

proto.checkHu = function(laizi, laiziNum, huInfo){
  logger.debug('胡牌检测 手牌:', this._data);
  if (laiziNum > 0) {
    laizi = this._transform(laizi);
    this.laizi = parseInt(this._type[laizi.type]+'0'+laizi.value);
    this.laiziNum = laiziNum;

    logger.debug('checkHu laizi:', this.laizi, this.laiziNum);
  } else {
    this.laizi = 0;
    this.laiziNum = 0;
  }

  if (laiziNum >= 3 && (this.area == 'yongchun' || this.area == 'fuzhou'
      || this.area == 'quanzhou'  || this.area == 'quangang'
      || this.area == 'dehua')) {
    if (this.area == 'fuzhou') { // 福州还要判断金龙
      if (this.checkHu(laizi, 0, huInfo))
      {
        huInfo['fzHu'] = 'jinLong';
        huInfo['jiang'] = this._transformR(this.jiangPai);
        return true;
      }
      else
      {
        if (huInfo['isQiangJin'] == undefined || huInfo['isQiangJin'] == 0) {
          huInfo['fzHu'] = 'sanJinDao';
          huInfo['jiang'] = this._transformR(this.jiangPai);
          return true;
        }
        else
        {
          this.laiziNum = laiziNum;
        }
      }
    }
    else
    {
      huInfo['jiang'] = this._transformR(this.jiangPai);
      return true;
    }

  }


  var tmpArr = [];
  tmpArr = this._data.concat(); // 创建一个麻将数组的copy

  var lzNumArr = []; // 每个分类需要癞子的数组
  for (var i=0; i<4; i++) {
    if (tmpArr[i].length > 0) {
      this.needLzNum = this.maxLaiziNum;
      this._getNeedLzInSub(tmpArr[i], 0);
    } else
      this.needLzNum = 0;
    lzNumArr.push(this.needLzNum);
  }

  var lzNumAll = lzNumArr[0] + lzNumArr[1] + lzNumArr[2] + lzNumArr[3];
  var isHu = false;
  // 将在万中
  var lzNum = lzNumArr[1] + lzNumArr[2] + lzNumArr[3];  // 如果需要的癞子小于等于当前的则计算将在将在万中需要的癞子的个数
  if (lzNum <= this.laiziNum) {
    var hasNum = this.laiziNum - lzNum;
    isHu = this._canHu(tmpArr[0], hasNum, huInfo);
    if (isHu) {
      this._fzHu(lzNumAll, huInfo);
      huInfo['jiang'] = this._transformR(this.jiangPai);
      return true;
    }
  }

  // 将在饼中
  var lzNum = lzNumArr[0] + lzNumArr[2] + lzNumArr[3];
  if (lzNum <= this.laiziNum) {
    var hasNum = this.laiziNum - lzNum;
    isHu = this._canHu(tmpArr[1], hasNum, huInfo);
    if (isHu) {
      this._fzHu(lzNumAll, huInfo);
      huInfo['jiang'] = this._transformR(this.jiangPai);
      return true;
    }
  }

  // 将在条中
  var lzNum = lzNumArr[0] + lzNumArr[1] + lzNumArr[3];
  if (lzNum <= this.laiziNum) {
    var hasNum = this.laiziNum - lzNum;
    isHu = this._canHu(tmpArr[2], hasNum, huInfo);
    if (isHu) {
      this._fzHu(lzNumAll, huInfo);
      huInfo['jiang'] = this._transformR(this.jiangPai);
      return true;
    }
  }

  // 将在字中
  var lzNum = lzNumArr[0] + lzNumArr[1] + lzNumArr[2];
  if (lzNum <= this.laiziNum) {
    var hasNum = this.laiziNum - lzNum;
    isHu = this._canHu(tmpArr[3], hasNum, huInfo);
    if (isHu) {
      this._fzHu(lzNumAll, huInfo);
      huInfo['jiang'] = this._transformR(this.jiangPai);
      return true;
    }
  }

  return false;
};

proto._fzHu = function(lzNum, huInfo) {
  if (this.area != 'fuzhou' || huInfo == undefined)
    return;

  if (lzNum == 0 && this.laiziNum == 2) {
    this.jiangPai = this.laizi;
    huInfo['fzHu'] = 'jinQue';
  } else if (this.laiziNum == 1 && this.lastPai == this.laizi) {
    // 另一种夹胡算法 只检测胡牌对应类型的手牌
    var t = parseInt(this.laizi / 100) - 1;
    var paiNum = [0,0,0,0,0,0,0,0,0,0]; // 手中每个牌对应的张数 paiNum[0]是牌的总数
    paiNum[0] = this._data[t].length; // 算一张癞子牌进来
    for (var i=0; i<paiNum[0]; i++) { // 统计每种牌的张数
      var v = this._data[t][i] % 10;
      paiNum[v]++;
    }
    paiNum[0]++;
    paiNum[this.laizi%10]++; // 癞子算进去
    if (this.jiangPai > 0 && parseInt(this.jiangPai/100) == t+1) {// 将牌扣除
      paiNum[0] -= 2;
      paiNum[this.jiangPai%10] -= 2;
    }

    var canJia = false;
    for (var i=1; i<=7;) {
      if (paiNum[i] == 3 && (paiNum[i+1] < 3 || paiNum[i+2] < 3)) { // 刻子 但不是三连刻
        if (this.lastPai % 10 == i) // 胡牌是刻子
          break;
        else {
          paiNum[0] -= 3;
          paiNum[i] -= 3;
        }
      } else if (paiNum[i]>0 && paiNum[i+1]>0 && paiNum[i+2]>0) { // 凑顺子
        if (this.lastPai % 10 == i+1) {
          paiNum[0] -= 3;
          paiNum[i]--;
          paiNum[i+1]--;
          paiNum[i+2]--;
          canJia = true;
        } else if (this.lastPai%10 == i && i == 1)
          break;
        else if (this.lastPai%10 == i+2 && i+2 == 9)
          break;
        else {
          paiNum[0] -= 3;
          paiNum[i]--;
          paiNum[i+1]--;
          paiNum[i+2]--;
        }
      } else { // 凑不了顺子 从下一个开始遍历
        i++;
      }
    }

    if (canJia && paiNum[0] == 0)
      huInfo['fzHu'] = 'jinKan';
    else
      huInfo['fzHu'] = 'puTong';
  } else
    huInfo['fzHu'] = 'puTong';
};

proto._getJiangNeedLz = function (arr) { // 计算每个将分类需要癞子的数量
  var minNeedNum = 4;
  var tmpArr = [];
  tmpArr = arr.concat();
  var arrLen = tmpArr.length;
  if (arrLen <= 0)
    return 2;

  for (var i=0; i<arrLen; i++) {
    if (i == arrLen - 1) {  // 如果是最后一张牌
      var tmp = tmpArr[i];
      tmpArr.splice(i, 1);
      this.needLzNum = this.maxLaiziNum;
      this._getNeedLzInSub(tmpArr, 0);
      minNeedNum = Math.min(minNeedNum, this.needLzNum + 1);
      tmpArr.splice(i, 0, tmp);
    } else {
      if (i + 2 == arrLen || tmpArr[i] % 10 != tmpArr[i + 2] % 10) {
        if (this._checkJiang(tmpArr[i], tmpArr[i + 1])) {
          var tmp1 = tmpArr[i];
          var tmp2 = tmpArr[i + 1];
          tmpArr.splice(i + 1, 1);
          tmpArr.splice(i, 1);
          this.needLzNum = this.maxLaiziNum;
          this._getNeedLzInSub(tmpArr, 0);
          minNeedNum = Math.min(minNeedNum, this.needLzNum);
          tmpArr.splice(i, 0, tmp1);
          tmpArr.splice(i + 1, 0, tmp2);
        }
      }

      if (tmpArr[i] % 10 != tmpArr[i + 1] % 10) {
        var tmp = tmpArr[i];
        tmpArr.splice(i, 1);
        this.needLzNum = this.maxLaiziNum;
        this._getNeedLzInSub(tmpArr, 0);
        minNeedNum = Math.min(minNeedNum, this.needLzNum + 1);
        tmpArr.splice(i, 0, tmp);
      }
    }
  }

  return minNeedNum;
};

proto._checkHuArr = function () { // 检查摸哪些牌能胡
  var tmpArr = [];
  tmpArr = this._data.concat(); // 创建一个麻将数组的copy

  var lzNumArr = []; // 每个分类需要癞子的数组
  for (var i=0; i<4; i++) {
    if (tmpArr[i].length > 0) {
      this.needLzNum = this.maxLaiziNum;
      this._getNeedLzInSub(tmpArr[i], 0);
    } else
      this.needLzNum = 0;
    lzNumArr.push(this.needLzNum);
  }

  var jaLzNumArr = []; // 每个将分类需要癞子的数组
  for (var i=0; i<4; i++) {
    var jdNeedLzNum = this._getJiangNeedLz(tmpArr[i]);
    jaLzNumArr.push(jdNeedLzNum);
  }

  var curLzNum = this.laiziNum;
  var paiArr = [[101,110],[201,210],[301,310],[401,408]];

  var tingArr = [];

  // 是否单调将
  var isAllHu = false;
  var needNum = 0;
  for (var i=0; i<4; i++)
    needNum += lzNumArr[i];

  if (curLzNum - needNum == 1)
    isAllHu = true;
  if (isAllHu) {
    for (var j=0; j<paiArr.length; j++) {
      for (var x=paiArr[j][0]; x<paiArr[j][1]; x++)
        tingArr.push(x);
    }
    return tingArr;
  }

  for (var i=0; i<4; i++) {
    // 听牌是将
    needNum = 0;
    for (var j=0; j<4; j++) {
      if (i != j)
        needNum = needNum + lzNumArr[j];
    }

    if (needNum <= curLzNum) {
      for (var k=paiArr[i][0]; k<paiArr[i][1]; k++) {
        var t = [k];
        t = t.concat(tmpArr[i]);
        t.sort(function (a, b) {
          return a - b;
        });

        var huInfo = {};
        if (this._canHu(t, curLzNum - needNum, huInfo))
          tingArr.push(k);
      }
    }

    // 听牌是扑
    for (var j=0; j<4; j++) {
      if (i != j) {
        needNum = 0;
        for (var k=0; k<4; k++) {
          if (k != i) {
            if (k == j)
              needNum += jaLzNumArr[k];
            else
              needNum += lzNumArr[k];
          }
        }

        if (needNum <= curLzNum) {
          for (var k=paiArr[i][0]; k<paiArr[i][1]; k++) {
            if (tingArr.indexOf(k) == -1) {
              var t = [k];
              t = t.concat(tmpArr[i]);
              t.sort(function (a, b) {
                return a - b;
              });
              this.needLzNum = this.maxLaiziNum;
              this._getNeedLzInSub(t, 0);
              if (this.needLzNum <= curLzNum - needNum)
                tingArr.push(k);
            }
          }
        }
      }
    }
  }

  if (tingArr.length > 0 && this.laiziNum > 0 && tingArr.indexOf(this.laizi) == -1)
    tingArr.push(this.laizi);

  return  tingArr;
};

proto.checkTing = function (laizi, laiziNum, tingInfo) { // 检查打哪些牌能听牌
  if (laiziNum > 0) {
    laizi = this._transform(laizi);
    this.laizi = parseInt(this._type[laizi.type]+'0'+laizi.value);
    this.laiziNum = laiziNum;
    logger.debug('checkTing laizi:', this.laizi, this.laiziNum);
  } else {
    this.laizi = 0;
    this.laiziNum = 0;
  }
  logger.debug('checkTing', laizi, laiziNum, tingInfo);
  var tmpArr = [];
  tmpArr = this._data.concat(); // 创建一个麻将数组的copy

  var lzNumArr = []; // 每个分类需要癞子的数组
  for (var i=0; i<4; i++) {
    if (tmpArr[i].length > 0) {
      this.needLzNum = this.maxLaiziNum;
      this._getNeedLzInSub(tmpArr[i], 0);
    } else
      this.needLzNum = 0;
    //logger.debug('_getNeedLzInSub', tmpArr[i], this.needLzNum, this._data);
    lzNumArr.push(this.needLzNum);
  }

  var jaLzNumArr = []; // 每个将分类需要癞子的数组
  for (var i=0; i<4; i++) {
    var jdNeedLzNum = this._getJiangNeedLz(tmpArr[i]);
    jaLzNumArr.push(jdNeedLzNum);
  }

  // 给一个癞子看能不能胡
  var curLzNum = this.laiziNum+1;
  var delArr = [];

  // 是否单调将
  var isAllHu = false;
  var needNum = 0;
  for (var i= 0; i<4; i++)
    needNum += lzNumArr[i];

  if (curLzNum - needNum == 1)
    isAllHu = true;

  logger.debug('checkTing', lzNumArr, isAllHu, curLzNum, needNum);
  if (isAllHu) {
    delArr = tmpArr.concat();
    return delArr;
  }

  var _unique = function(arr)
  {
    var n = {}, r = []; //n为hash表，r为临时数组
    for(var i=0; i<arr.length; i++) //遍历当前数组
    {
      if (!n[arr[i]]) //如果hash表中没有当前项
      {
        n[arr[i]] = true; //存入hash表
        r.push(arr[i]); //把当前数组的当前项push到临时数组里面
      }
    }
    return r;
  }

  for (var i=0; i<4; i++) {
    var setTmp = _unique(tmpArr[i]);
    for (var x = 0; x < setTmp.length; x++) {
      var t = [];
      t = tmpArr[i].concat();
      t.splice(t.indexOf(setTmp[x]), 1);

      // 将
      var needNum = 0;
      for (var j = 0; j < 4; j++) {
        if (i != j)
          needNum = needNum + lzNumArr[j];
      }

      if (needNum <= curLzNum && delArr.indexOf(setTmp[x]) == -1) {
        var huInfo = {};
        if (this._canHu(t, curLzNum - needNum, huInfo))
          delArr.push(setTmp[x]);
      }

      // 扑
      for (var j=0; j<4; j++) {
        if (tmpArr[j].length == 0)
          continue;

        if (i != j) {
          needNum = 0;
          for (var k=0; k<4; k++) {
            if (k != i) {
              if (k == j)
                needNum += jaLzNumArr[k];
              else
                needNum += lzNumArr[k];
            }
          }

          if (needNum <= curLzNum && delArr.indexOf(setTmp[x]) == -1) {
            this.needLzNum = this.maxLaiziNum;
            this._getNeedLzInSub(t, 0);
            if (this.needLzNum <= curLzNum - needNum)
              delArr.push(setTmp[x]);
          }
        }
      }
    }
  }

  logger.debug('checkTing', delArr);
  for (var i=0; i<delArr.length; i++) {
    var t = parseInt(delArr[i] / 100);
    var k = this._data[t-1].indexOf(delArr[i]);
    this._data[t-1].splice(k, 1);
    var huArr = this._checkHuArr();

    var ting = {};
    ting['del'] = this._transformR(delArr[i]);
    ting['hu'] = [];
    ting['num'] = [];
    for (var j=0; j<huArr.length; j++) {
      ting['hu'].push(this._transformR(huArr[j]));
    }
    tingInfo.push(ting);

    this._data[t-1].splice(k, 0, delArr[i]);
  }

  // 判断打掉癞子是否也听牌
  if (this.laiziNum > 0) {
    this.laiziNum--;
    var huArr = this._checkHuArr();
    if (huArr.length > 0) {
      var ting = {};
      ting['del'] = this._transformR(this.laizi);
      ting['hu'] = [];
      ting['num'] = [];
      for (var j=0; j<huArr.length; j++) {
        ting['hu'].push(this._transformR(huArr[j]));
      }
      tingInfo.push(ting);
    }
    this.laiziNum++;
  }
};

module.exports = Majhong;
