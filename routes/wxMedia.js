/*
	微信公众号素材管理
	获取素材列表：get https://wechat.weiquaninfo.cn/wxMedia/getMediaList
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');
var searchJson = {
	type: "news",
	offset: 0,
	count: 20
}

//////////////////////////////////////////////////////////////////////////
// 获取永久素材列表
router.get('/getMediaList', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return getMediaList(access_token);
	}).then((result) => {
		res.status(200).send(result);
	}).catch((error) => {
		logger.error(error);
		res.status(417).send("error");
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
// 获取素材列表
function getMediaList(access_token) {
	return new Promise((resolve, reject) => {
		const postData = JSON.stringify(searchJson);
		const options = {
			hostname: "api.weixin.qq.com",
			path: `/cgi-bin/material/batchget_material?access_token=${access_token}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData, 'utf-8')
			}
		};
		const req = https.request(options, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 反馈结果
				// logger.info("rawData:", rawData);
				resolve(JSON.parse(rawData));
			});
		});
		req.on('error', (e) => {
			reject(`problem with request: ${e.message}`);
		});
		req.write(postData);
		req.end();
	})
}

//
module.exports = router;