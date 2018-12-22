/**
 * Created by bruce.yang on 2017/3/19.
 */
var logger = require('pomelo-logger').getLogger('majhong-log', __filename);

var Majhong = function () {
  //1-9     万
  //11-19   筒
  //21-29   条
  //31-37   字:中发白东西南北
  this.formatData = [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ];
  //  数据结构例子, 第0列表示同花色总数
  //  3个1万   3个2筒
  //   var formatData = [
  // 	[3,3,0,0,0,0,0,0,0,0],
  // 	[3,0,2,0,0,0,0,0,0,0],
  // 	[0,0,0,0,0,0,0,0,0,0],
  // 	[0,0,0,0,0,0,0,0]
  // ];

  this.formatType = {
    'W':0,
    'B':1,
    'T':2,
    'Z':3,
    '0':'W',
    '1':'B',
    '2':'T',
    '3':'Z'
  };
};

var proto = Majhong.prototype;

proto._transform = function(pai) { // 格式数组与箭牌风牌定义不一致,特转换箭牌风牌
  var _tPai = {type: pai.type, value: pai.value};

  if (_tPai.type == 'J')
    _tPai.type = 'Z';
  else if (pai.type == 'F') {
    _tPai.type = 'Z';
    _tPai.value += 3;
  }

  return _tPai;
}

proto._transformR = function(pai) { // 逆转箭牌风牌
  if (pai[0] == 'Z') {
    if (parseInt(pai[1]) < 4)
      pai[0] = 'J';
    else {
      pai[0] = 'F';
      pai[1] = '' + (parseInt(pai[1]) - 3);
    }
  }

  return {type: pai[0], value: parseInt(pai[1])};
}

proto.clear = function () {
  this.formatData = [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ];
}

proto.addPai = function (pai) {
  pai = this._transform(pai);
  var row = this.formatType[pai.type];
  if (row != undefined) {
    //logger.debug('addPai:', pai);
    this.formatData[row][0]++;
    this.formatData[row][pai.value]++;
  }
};

proto.delPai = function (pai, num) {
  pai = this._transform(pai);

  var row = this.formatType[pai.type];
  if (row != undefined) {
    logger.debug('delPai:', pai, num);
    if (num != undefined) {
      this.formatData[row][0] -= num;
      this.formatData[row][pai.value] -= num;
    } else {
      this.formatData[row][0]--;
      this.formatData[row][pai.value]--;
    }
  }
};

proto.checkHu = function(huInfo){
  logger.debug('胡牌检测 手牌:', this.formatData);

  //判断手牌总张数是否正确
  var sum = this.formatData[0][0]+this.formatData[1][0]+this.formatData[2][0]+this.formatData[3][0]+this.formatData[4][0];
  if([2,5,8,11,14,17].indexOf(sum) == -1){
    logger.error('牌数不对');
    return false;
  }

  //是否满足3n+2模型 粗过滤一遍
  var jiangRow = -1;
  var jiangValue = 0;
  for (i=0; i<4; i++) {
    var _3n2 = this.formatData[i][0] % 3;
    if (_3n2 == 1) { // 同花色的牌总数不符合胡牌条件
      return false;
    }
    if (_3n2 == 2) {
      if (jiangRow > -1) { // 将牌已存在
        return false;
      }
      jiangRow = i;
    }
  }

  // 检测箭牌风牌是否满足刻子
  var _2n = 0; // 对子出现次数
  if (this.formatData[3][0] > 0) {
    for (i=1; i<8; i++) {
      if (jiangRow != 3 && this.formatData[3][i] % 3 != 0) // 无将牌 则必须每个面值的牌都应该0或3张
        return false;
      else if (jiangRow == 3) { // 有将牌 则看出现几次将牌
        if (this.formatData[3][i] == 1) // 牌数不符合胡牌条件
          return false;
        else if (this.formatData[3][i] == 2) {
          _2n++;
          jiangValue = i;
          if (_2n > 1) // 将牌对数不符合胡牌条件
            return false;
        }
      }
    }
  }

  // 递归检测WTB 是否能拆成刻子或者顺子
  huInfo['pu'] = [];
  function _check(row, pais) {
    if (pais[0] == 0) {
      return true;
    }
    //寻找第一张牌
    for (var j=1; j<10; j++) {
      if (pais[j] != 0)
        break;
    }

    var result = false;
    if (pais[j] >= 3) //作为刻牌
    {
      //除去这3张刻牌
      pais[j] -= 3;
      pais[0] -= 3;
      huInfo['pu'].push([this._transformR(this.formatType[''+row]+j),
                      this._transformR(this.formatType[''+row]+j),
                      this._transformR(this.formatType[''+row]+j)]);
      result = _check(pais);
      //还原这3张刻牌
      pais[j] += 3;
      pais[0] += 3;
      return result;
    }

    //作为顺牌
    if ((j <= 7) && (pais[j+1] > 0) && (pais[j+2] > 0)) {
      //除去这3张顺牌
      pais[j]--;
      pais[j+1]--;
      pais[j+2]--;
      pais[0] -= 3;
      huInfo['pu'].push([this._transformR(this.formatType[''+row]+j),
                        this._transformR(this.formatType[''+row]+(j+1)),
                        this._transformR(this.formatType[''+row]+(j+2))]);
      result = _check(pais);
      //还原这3张顺牌
      pais[j]++;
      pais[j+1]++;
      pais[j+2]++;
      pais[0] += 3;
      return result;
    }

    return false;
  }

  // 分析没有将牌的花色 看看能不能全部拆成刻子或顺子
  for (i=0; i<3; i++) {
    if (i != jiangRow) {
      if (!_check(i, this.formatData[i])) {
        return false;
      }
    }
  }

  if (jiangRow == 3) {// 如果将牌是箭牌或者风牌 则走到这里已经胡了
    huInfo['jiang'] = this._transformR(this.formatType['3']+jiangValue);
    return true;
  }

  // 分析含将牌的花色,因为要对将进行轮询,效率较低,放在最后
  var success = false; //指示除掉“将”后能否通过
  for (var j=1; j <10; j++) //对列进行操作,用j表示
  {
    if (this.formatData[jiangRow][j] >= 2) {
      //除去这2张将牌
      this.formatData[jiangRow][j] -= 2;
      this.formatData[jiangRow][0] -= 2;
      if (_check(jiangRow, this.formatData[jiangRow])) {
        success = true;
        huInfo['jiang'] = this._transformR(this.formatType[''+jiangRow]+j);
      }
      //还原这2张将牌
      this.formatData[jiangRow][j] += 2;
      this.formatData[jiangRow][0] += 2;
      if (success) break;
    }
  }
  return success;
}

module.exports = Majhong;