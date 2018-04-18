/*
	微信小程序登录
	登录：post https://wechat.weiquaninfo.cn/wxAppLogin/token
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

//////////////////////////////////////////////////////////////////////////
// 小程序登录接口
router.post('/token', function(req, res, next) {
	res.send("token");
});

//////////////////////////////////////////////////////////////////////////
// 获取access_token
function getAccessToken() {
	return new Promise((resolve, reject) => {
		redisClient.get('token', (error, access_token) => {
			if (error) return reject(error);
			access_token = access_token.replace(/\"/g, "");
			return resolve(access_token);
		})
	})
}

//
module.exports = router;