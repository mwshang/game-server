module.exports = {
    OK: 200,
    FAIL: 500,
    ENTRY: {
        FA_TOKEN_INVALID: 	"登录失败",
        FA_TOKEN_EXPIRE: 	"登录失败",
        FA_AUTH_FAIL: 	    "认证失败",
        FA_USER_NOT_EXIST:  "用户信息不存在"
    },
    GATE: {
        FA_NO_SERVER_AVAILABLE: "服务器维护",
        FA_CONFIG_ERROR:        "参数错误"
    },
    REGLOGIN: {
        FA_PARAM_INVALID: 	"无效的参数",
        FA_CREATE_ERROR: 	"玩家创建重复",
        FA_USER_NOT_EXIST: 	"用户信息不存在",
        FA_PASSWORD_ERROR:  "您的密码错啦",
        FA_ACCOUNTD_LOCKED: "您的账号被封啦"
    },
    SANGONG: {
        FA_USER_EXISTING: 		"玩家信息已存在",
        FA_USER_NOT_EXIST: 	    "玩家信息不存在",
        FA_UID_INVALID: 	    "错误的玩家信息",
        FA_NO_TABLE: 	        "错误的桌子",
        FA_ERROR_MYSQL:         "错误的信息"
    },
    MAJHONG: {
        FA_USER_EXISTING: 		"玩家信息已存在",
        FA_USER_NOT_EXIST: 	    "玩家信息不存在",
        FA_UID_INVALID: 	    "错误的玩家信息",
        FA_NO_TABLE: 	        "错误的桌子",
        FA_ERROR_MYSQL:         "错误的信息",
        FA_NO_GEM:              "您的钻石数量不足"
    },
    CHAT: {
        FA_CHANNEL_CREATE: 		3001,
        FA_CHANNEL_NOT_EXIST: 	3002,
        FA_UNKNOWN_CONNECTOR: 	3003,
        FA_USER_NOT_ONLINE: 	3004
    },

    FANG_KA_BU_ZHU_ERROR:{CODE:10001,ERROR:"您的钻石不足,请及时充值"},

    UNKNOWN_ERROR:{CODE:99999,ERROR:"游戏错误!"}
};