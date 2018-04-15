/*
	微信公众号推送客服消息
	推送客服消息：post http://wechat.weiquaninfo.cn/wxKfMsg/sendMsg
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

//////////////////////////////////////////////////////////////////////////
// 推送客服消息
router.post('/sendMsg', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return sendMessage(access_token);
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
// 推送客服消息
function sendMessage(access_token) {
	return new Promise((resolve, reject) => {
		let openId = "";
		let textMsg = {
			touser: openId,
			msgtype: "text",
			text: {
				"content": `欢迎使用以下服务：
					1：小程序<a href="http://www.qq.com" data-miniprogram-appid="wx65423a2f6908bc55" data-miniprogram-path="pages/index/index">Hi游</a>`
			}
		}
		const postData = JSON.stringify(textMsg);
		const options = {
			hostname: "api.weixin.qq.com",
			path: `/cgi-bin/message/custom/send?access_token=${access_token}`,
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
				let result = JSON.parse(rawData);
				if (result.errcode == 0) {
					// 发送成功
					resolve("success");
				} else {
					reject(result);
				}
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