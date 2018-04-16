/*
	微信公众号用户管理
	获取用户基本信息：get https://wechat.weiquaninfo.cn/wxUser/getUserInfo
	获取关注用户列表：get https://wechat.weiquaninfo.cn/wxUser/getUserList
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

// const
const openId = "oMBhJ0tdCdBtY07FXuzsywkEyU6A";
const openId2 = "oMBhJ0tF0gZBDx0aOSvdY8DW3qoE";
const openId3 = "oMBhJ0pTWmx8kTAY7aV4FDGAXVzM";
const openId4 = "oMBhJ0q6xj0m-FICszr6UezwJjPE";
const openId5 = "oMBhJ0pSghlN3w_WC237w-Hecwn4";
const openId6 = "oMBhJ0mE7W9p_MLpMihh9DdMdOPw";

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
// 获取关注用户列表
router.get('/getUserList', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return getUserList(access_token);
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

//////////////////////////////////////////////////////////////////////////
// 获取关注用户列表
function getUserList(access_token) {
	return new Promise((resolve, reject) => {
		let url = `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${access_token}&next_openid=`;
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