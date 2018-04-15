/*
	微信公众号用户管理
	获取用户基本信息：get http://wechat.weiquaninfo.cn/wxUser/getUserInfo
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

// const
const openId = "oMBhJ0tdCdBtY07FXuzsywkEyU6A";

//////////////////////////////////////////////////////////////////////////
// 获取用户基本信息
router.get('/getUserInfo', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return getUserInfo(access_token);
	}).then((result) => {
		res.status(200).send(result);
	}).catch((error) => {
		logger.error(error);
		res.status(417).send(error);
	})
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

//////////////////////////////////////////////////////////////////////////
// 获取用户基本信息
function getUserInfo(access_token) {
	return new Promise((resolve, reject) => {
		let url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${access_token}&openid=${openId}&lang=zh_CN`;
		https.get(url, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 结果
				let result = JSON.parse(rawData);
				if (typeof(result.errcode) == "undefined") {
					// 获取成功
					// logger.info(result);
					resolve(result);
				} else {
					reject(result);
				}
			});
		}).on('error', (e) => {
			return reject(e);
		});
	})
}

//
module.exports = router;