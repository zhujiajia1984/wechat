/*
	微信小程序登录
	登录：post https://wechat.weiquaninfo.cn/wxAppLogin/token
	校验token：https://wechat.weiquaninfo.cn/wxAppLogin/verityToken
	{headers:{Authorization}}
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var https = require('https');
var jwt = require('jsonwebtoken');

// const
const appId = "wxc7b32c9521bcc0d5"; // 小程序appid
const appSecret = "470393669b0d477adcab09b0aa5a88d6"; // 小程序appsecret
const jwt_secret = "201701200315zxtZJJgm135152"; // jwt secret
const jwt_header = { issuer: 'zjj', subject: 'wxApp' }; // jwt header

// mongodb
const url = 'mongodb://mongodb_mongodb_1:27017';
const User = require('./wxMongoAPI/wxAppLoginUser/wxAppUser');

//////////////////////////////////////////////////////////////////////////
// 小程序登录接口
router.post('/token', function(req, res, next) {
	let { code } = req.body;
	if (typeof(code) == "undefined" || code == "") {
		logger.error("need code");
		res.status(417).send("need code!");
		return;
	}
	// 业务处理
	getWxSessionAndOpenid(code).then((result) => {
		return saveUserInfo(result);
	}).then((data) => {
		return createJwtToken(data);
	}).then((token) => {
		res.status(200).json({
			token: token,
			result_msg: "success"
		});
	}).catch((error) => {
		logger.error(error);
		res.status(417).send(error);
	})
});

//////////////////////////////////////////////////////////////////////////
// 校验小程序token是否正确
router.all('/verityToken', function(req, res, next) {
	let token = req.headers['authorization'];
	jwt.verify(token, jwt_secret, jwt_header, (err, decoded) => {
		if (err) return res.status(417).send(err);
		logger.info(decoded);
		res.send(decoded);
	});
});

// function
//////////////////////////////////////////////////////////////////////////
// 生成jwt token（使用id和time）
function createJwtToken(data) {
	return new Promise((resolve, reject) => {
		jwt.sign({ id: data.id, lastModified: data.lastModified },
			jwt_secret, jwt_header, (err, token) => {
				if (err) return reject(err);
				resolve(token);
			});
	})
}

//////////////////////////////////////////////////////////////////////////
// 用户信息保存到数据库
function saveUserInfo(data) {
	return new Promise((resolve, reject) => {
		// 保存到数据库
		let user = new User(url);
		user.updateUser(data).then((result) => {
			resolve(result);
		}).catch((error) => {
			reject(error);
		})
	})
}

//////////////////////////////////////////////////////////////////////////
// 获取session_key、openid和unionid
function getWxSessionAndOpenid(code) {
	return new Promise((resolve, reject) => {
		let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
		https.get(url, (res) => {
			const { statusCode } = res;
			const contentType = res.headers['content-type'];
			let error;
			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}`);
			} else if (!/^text\/plain/.test(contentType)) {
				error = new Error('Invalid content-type.\n' +
					`Expected text/plain but received ${contentType}`);
			}
			if (error) {
				logger.error(error.message);
				// consume response data to free up memory
				res.resume();
				return;
			}
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				let result = JSON.parse(rawData);
				if (typeof(result.errcode) != "undefined") return reject(result);
				resolve(result);
			});
		}).on('error', (e) => {
			reject(`Got error: ${e.message}`);
		});
	})
}

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